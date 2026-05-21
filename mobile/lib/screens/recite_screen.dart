import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';

import '../api/client.dart';
import '../models/verse.dart';
import '../services/recitation_service.dart';
import '../util/diff.dart';

// Number of ayat in each surah (index 0 = Surah 1).
const _surahVerseCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, // 1–10
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135, // 11–20
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, // 21–30
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85, // 31–40
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, // 41–50
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13, // 51–60
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, // 61–70
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42, // 71–80
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, // 81–90
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11, // 91–100
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3, // 101–110
  5, 4, 5, 6, // 111–114
];

class ReciteScreen extends StatefulWidget {
  const ReciteScreen({super.key, this.initialParah = 1});
  final int initialParah;

  @override
  State<ReciteScreen> createState() => _ReciteScreenState();
}

class _ReciteScreenState extends State<ReciteScreen> {
  late int _parah = widget.initialParah;
  String _verseKey = '1:1';
  Verse? _verse;
  Map<String, String> _similarTexts = {};
  int _matched = 0;
  int? _divergenceIdx;
  String? _driftKey;
  double _driftScore = 0;
  double _expectedScore = 0;
  String _transcript = '';
  String? _error;
  bool _listening = false;

  final _service = RecitationService();
  StreamSubscription<RecitationEvent>? _sub;
  final _beepPlayer = AudioPlayer();
  DateTime _lastBeep = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _verseKey = _firstVerseOfParah(_parah);
    _loadVerse();
    _sub = _service.events.listen(_onEvent);
  }

  String _firstVerseOfParah(int p) {
    const starts = [
      '1:1', '2:142', '2:253', '3:93', '4:24', '4:148', '5:83', '6:111',
      '7:88', '8:41', '9:94', '11:6', '12:53', '15:1', '17:1', '18:75',
      '21:1', '23:1', '25:21', '27:56', '29:46', '33:31', '36:28', '39:32',
      '41:47', '46:1', '51:31', '58:1', '67:1', '78:1',
    ];
    return starts[p.clamp(1, 30) - 1];
  }

  void _nextVerse() {
    final parts = _verseKey.split(':');
    var surah = int.parse(parts[0]);
    var ayah = int.parse(parts[1]);
    final maxAyah = _surahVerseCounts[surah - 1];
    if (ayah < maxAyah) {
      ayah++;
    } else if (surah < 114) {
      surah++;
      ayah = 1;
    } else {
      return; // already at end of Quran
    }
    _service.stop();
    setState(() => _verseKey = '$surah:$ayah');
    _loadVerse();
  }

  void _prevVerse() {
    final parts = _verseKey.split(':');
    var surah = int.parse(parts[0]);
    var ayah = int.parse(parts[1]);
    if (ayah > 1) {
      ayah--;
    } else if (surah > 1) {
      surah--;
      ayah = _surahVerseCounts[surah - 1];
    } else {
      return; // already at start of Quran
    }
    _service.stop();
    setState(() => _verseKey = '$surah:$ayah');
    _loadVerse();
  }

  Future<void> _loadVerse() async {
    _service.updateVerseText(null);
    setState(() {
      _verse = null;
      _similarTexts = {};
      _matched = 0;
      _divergenceIdx = null;
      _driftKey = null;
      _transcript = '';
    });
    try {
      final vs = await ApiClient.instance.fetchVerses([_verseKey]);
      final muta = await ApiClient.instance.fetchMutashabihForVerse(_verseKey);
      Map<String, String> similar = {};
      if (muta != null && muta.similar.isNotEmpty) {
        final keys = muta.similar.map((s) => s.key).toList();
        final simVerses = await ApiClient.instance.fetchVerses(keys);
        similar = {for (final v in simVerses) v.key: v.textUthmani};
      }
      setState(() {
        _verse = vs.isNotEmpty ? vs.first : null;
        _similarTexts = similar;
      });
      _service.updateVerseText(_verse?.textUthmani);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  void _onEvent(RecitationEvent e) {
    if (!mounted) return;
    switch (e.type) {
      case RecitationEventType.listening:
        setState(() => _listening = true);
        break;
      case RecitationEventType.stopped:
        setState(() => _listening = false);
        break;
      case RecitationEventType.error:
        setState(() => _error = e.errorMessage);
        break;
      case RecitationEventType.chunk:
        final full = e.fullTranscript ?? '';
        setState(() => _transcript = full);
        if (_verse != null) {
          final matched = matchedCount(full, _verse!.textUthmani);
          final div = findDivergenceIndex(
            full, _verse!.textUthmani,
            tolerateMisses: 1,
          );
          setState(() {
            _matched = matched;
            _divergenceIdx = div >= 0 ? div : null;
          });

          // Completion guard: require at least 75% of words matched so short
          // verses don't advance after a single lucky word.
          if (div < 0) {
            final eLen = _verse!.textUthmani.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).length;
            final minWords = eLen <= 3 ? eLen : (eLen * 0.75).ceil().clamp(3, eLen);
            if (matched >= minWords) {
              _service.stop();
              Future.delayed(const Duration(milliseconds: 700), () {
                if (!mounted) return;
                _nextVerse();
              });
            }
          } else {
            _maybeBeep();
            _checkDrift(full);
          }
        }
        break;
    }
  }

  void _checkDrift(String transcript) {
    if (_similarTexts.isEmpty || _verse == null) return;
    final expectedScore = scoreMatch(transcript, _verse!.textUthmani);
    String? bestKey;
    double bestScore = 0;
    _similarTexts.forEach((key, text) {
      final s = scoreMatch(transcript, text);
      if (s > bestScore) {
        bestScore = s;
        bestKey = key;
      }
    });
    if (bestKey != null && bestScore >= 0.5 && bestScore - expectedScore >= 0.15) {
      setState(() {
        _driftKey = bestKey;
        _driftScore = bestScore;
        _expectedScore = expectedScore;
      });
    } else {
      setState(() => _driftKey = null);
    }
  }

  Future<void> _maybeBeep() async {
    final now = DateTime.now();
    if (now.difference(_lastBeep).inMilliseconds < 2000) return;
    _lastBeep = now;
    // Visual flash via divergenceIdx highlight acts as the cue on mobile.
  }

  @override
  void dispose() {
    _sub?.cancel();
    _service.dispose();
    _beepPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final parts = _verseKey.split(':');
    final surah = int.parse(parts[0]);
    final ayah = int.parse(parts[1]);
    final isFirst = surah == 1 && ayah == 1;
    final isLast = surah == 114 && ayah == _surahVerseCounts[113];

    return Scaffold(
      appBar: AppBar(title: const Text('Recite')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Parah selector
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Parah', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 44,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: 30,
                      itemBuilder: (_, i) {
                        final n = i + 1;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text('$n'),
                            selected: n == _parah,
                            onSelected: (_) {
                              _service.stop();
                              setState(() {
                                _parah = n;
                                _verseKey = _firstVerseOfParah(n);
                              });
                              _loadVerse();
                            },
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Drift alert
          if (_driftKey != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                border: Border.all(color: Colors.red.shade300, width: 2),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '⚠ Drifting into $_driftKey',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your recitation matches $_driftKey ${(_driftScore * 100).round()}% vs ${(_expectedScore * 100).round()}% for $_verseKey.',
                    style: TextStyle(fontSize: 12, color: Colors.red.shade800),
                  ),
                ],
              ),
            ),

          // Verse card with mic
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        _verseKey,
                        style: TextStyle(
                          color: colors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const Spacer(),
                      _MicButton(
                        listening: _listening,
                        onStart: () => _service.start(verseText: _verse?.textUthmani),
                        onStop: () => _service.stop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_verse == null)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else
                    Directionality(
                      textDirection: TextDirection.rtl,
                      child: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 6,
                        runSpacing: 8,
                        children: [
                          for (var i = 0; i < _verse!.words.length; i++)
                            _wordChip(_verse!.words[i].text, i),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Transcript
          if (_transcript.isNotEmpty) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'WHAT WE HEARD',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54),
                    ),
                    const SizedBox(height: 6),
                    Directionality(
                      textDirection: TextDirection.rtl,
                      child: Text(_transcript, style: const TextStyle(fontSize: 18, height: 1.8)),
                    ),
                  ],
                ),
              ),
            ),
          ],

          // Error
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(_error!, style: TextStyle(color: Colors.red.shade800, fontSize: 12)),
            ),
          ],

          // Previous / Next navigation
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: isFirst ? null : _prevVerse,
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Previous'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isLast ? null : _nextVerse,
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('Next'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: colors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _wordChip(String text, int i) {
    final isMatched = i < _matched;
    final isDiv = _divergenceIdx != null && i == _divergenceIdx;
    final isCurrent = _listening && _divergenceIdx == null && i == _matched;
    Color? bg;
    Color fg = Colors.black87;
    if (isDiv) {
      bg = Colors.red.shade100;
      fg = Colors.red.shade900;
    } else if (isMatched) {
      fg = Colors.green.shade700;
    } else if (isCurrent) {
      bg = Colors.amber.shade100;
      fg = Colors.amber.shade900;
    }
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: isDiv ? Border.all(color: Colors.red.shade500, width: 2) : null,
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 26,
          height: 1.9,
          color: fg,
          fontWeight: isDiv || isMatched ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }
}

class _MicButton extends StatelessWidget {
  const _MicButton({required this.listening, required this.onStart, required this.onStop});
  final bool listening;
  final VoidCallback onStart;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: listening ? onStop : onStart,
      icon: Icon(listening ? Icons.stop : Icons.mic),
      label: Text(listening ? 'Listening — Tap to stop' : 'Start reciting'),
      style: ElevatedButton.styleFrom(
        backgroundColor: listening ? Colors.red.shade500 : Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),
    );
  }
}
