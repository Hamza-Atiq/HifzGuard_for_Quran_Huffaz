import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/client.dart';
import '../models/mutashabih_entry.dart';
import '../models/verse.dart';
import '../util/audio_urls.dart';
import '../util/diff.dart';

class CompareScreen extends StatefulWidget {
  const CompareScreen({super.key, required this.sourceKey});
  final String sourceKey;

  @override
  State<CompareScreen> createState() => _CompareScreenState();
}

class _CompareScreenState extends State<CompareScreen> {
  MutashabihEntry? _entry;
  List<Verse> _verses = [];
  bool _loading = true;
  String? _error;
  String _reciterId = 'mishary';
  String? _playingKey;
  bool _sequenceMode = false;
  bool _userStopped = false;
  final _player = AudioPlayer();

  @override
  void initState() {
    super.initState();
    _player.onPlayerStateChanged.listen((s) {
      // Reset _playingKey ONLY for user-driven stops or completion of a
      // single-verse play. While running a sequence, leave _playingKey
      // alone — _playSequence manages it.
      if (s == PlayerState.stopped && _userStopped) {
        if (mounted) setState(() => _playingKey = null);
        _userStopped = false;
      } else if (s == PlayerState.completed && !_sequenceMode) {
        if (mounted) setState(() => _playingKey = null);
      }
    });
    _hydrateReciter();
    _load();
  }

  Future<void> _hydrateReciter() async {
    final p = await SharedPreferences.getInstance();
    final r = p.getString('reciter') ?? 'mishary';
    if (mounted) setState(() => _reciterId = r);
  }

  Future<void> _load() async {
    try {
      final entry = await ApiClient.instance.fetchMutashabihForVerse(widget.sourceKey);
      if (entry == null) {
        setState(() {
          _loading = false;
          _error = 'No mutashabihat data for ${widget.sourceKey}';
        });
        return;
      }
      final keys = [entry.src.key, ...entry.similar.map((s) => s.key)];
      final verses = await ApiClient.instance.fetchVerses(keys);
      setState(() {
        _entry = entry;
        _verses = verses;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _play(String key) async {
    setState(() => _playingKey = key);
    await _player.play(UrlSource(audioUrlFor(key, _reciterId)));
  }

  Future<void> _stop() async {
    _userStopped = true;
    _sequenceMode = false;
    await _player.stop();
    if (mounted) setState(() => _playingKey = null);
  }

  Future<void> _playSequence(List<String> keys) async {
    _sequenceMode = true;
    try {
      for (final k in keys) {
        if (!_sequenceMode) break; // user pressed stop
        setState(() => _playingKey = k);
        await _player.play(UrlSource(audioUrlFor(k, _reciterId)));
        // Wait for THIS chunk's completion event
        await _player.onPlayerComplete.first;
        if (!_sequenceMode) break;
        await Future.delayed(const Duration(milliseconds: 500));
      }
    } finally {
      _sequenceMode = false;
      if (mounted) setState(() => _playingKey = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Compare ${widget.sourceKey}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final entry = _entry!;
    final byKey = {for (final v in _verses) v.key: v};
    final src = byKey[entry.src.key];
    if (src == null) {
      return const Center(child: Text('Source verse failed to load.'));
    }

    final allKeys = [entry.src.key, ...entry.similar.map((s) => s.key)];
    final playing = _playingKey != null;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _audioBar(allKeys, playing),
        const SizedBox(height: 12),
        for (final sim in entry.similar)
          if (byKey[sim.key] != null) ...[
            _diffPair(src, byKey[sim.key]!),
            const SizedBox(height: 16),
          ],
      ],
    );
  }

  Widget _audioBar(List<String> keys, bool playing) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.volume_up_outlined, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButton<String>(
                    value: _reciterId,
                    isExpanded: true,
                    underline: const SizedBox.shrink(),
                    onChanged: (id) async {
                      if (id == null) return;
                      await _stop();
                      final p = await SharedPreferences.getInstance();
                      await p.setString('reciter', id);
                      setState(() => _reciterId = id);
                    },
                    items: [
                      for (final r in kReciters)
                        DropdownMenuItem(value: r.id, child: Text(r.name)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final key in keys)
                  ElevatedButton.icon(
                    onPressed: () {
                      if (_playingKey == key) {
                        _stop();
                      } else {
                        _play(key);
                      }
                    },
                    icon: Icon(
                      _playingKey == key ? Icons.stop_circle : Icons.play_arrow,
                      size: 18,
                    ),
                    label: Text(key, style: const TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _playingKey == key
                          ? Colors.green
                          : Theme.of(context).cardColor,
                      foregroundColor: _playingKey == key
                          ? Colors.white
                          : Theme.of(context).colorScheme.onSurface,
                      elevation: 0,
                      side: BorderSide(color: Colors.black.withOpacity(0.1)),
                    ),
                  ),
                ElevatedButton.icon(
                  onPressed: playing ? _stop : () => _playSequence(keys),
                  icon: Icon(playing ? Icons.stop : Icons.queue_music, size: 18),
                  label: Text(playing ? 'Stop' : 'Play all'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _diffPair(Verse a, Verse b) {
    final aWords = a.textUthmani.split(RegExp(r'\s+'));
    final bWords = b.textUthmani.split(RegExp(r'\s+'));
    final d = diffVerses(aWords, bWords);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _labelRow(a.key),
            const SizedBox(height: 6),
            _arabicLine(d.left),
            if (a.translation != null && a.translation!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                a.translation!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.black54),
              ),
            ],
            const Divider(height: 28),
            _labelRow(b.key),
            const SizedBox(height: 6),
            _arabicLine(d.right),
            if (b.translation != null && b.translation!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                b.translation!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.black54),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _labelRow(String key) {
    return Text(
      key,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.bold,
        color: Theme.of(context).colorScheme.primary,
      ),
    );
  }

  Widget _arabicLine(List<DiffWord> words) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final w in words)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                color: _wordBg(w.status),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                w.text,
                style: TextStyle(
                  fontSize: 22,
                  height: 2.0,
                  color: _wordFg(w.status),
                  fontWeight: w.status == WordStatus.same ? FontWeight.normal : FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Color _wordBg(WordStatus s) {
    switch (s) {
      case WordStatus.diff:
        return Colors.amber.shade100;
      case WordStatus.extra:
        return Colors.red.shade100;
      case WordStatus.same:
        return Colors.transparent;
    }
  }

  Color _wordFg(WordStatus s) {
    switch (s) {
      case WordStatus.diff:
        return Colors.amber.shade900;
      case WordStatus.extra:
        return Colors.red.shade900;
      case WordStatus.same:
        return Colors.black87;
    }
  }
}
