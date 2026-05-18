import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../util/hifz_state.dart';

class HifzScreen extends StatefulWidget {
  const HifzScreen({super.key});

  @override
  State<HifzScreen> createState() => _HifzScreenState();
}

enum _Mode { view, markMemorized, pickSabaq }

class _HifzScreenState extends State<HifzScreen> {
  _Mode _mode = _Mode.view;
  Map<int, String> _activity = {};
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _hydrate();
  }

  Future<void> _hydrate() async {
    await HifzState.instance.hydrate();
    _activity = await HifzState.instance.readActivity();
    setState(() => _loaded = true);
  }

  Future<void> _tap(int parah) async {
    if (_mode == _Mode.markMemorized) {
      await HifzState.instance.toggleMemorized(parah);
      setState(() {});
    } else if (_mode == _Mode.pickSabaq) {
      final cur = HifzState.instance.sabaq;
      await HifzState.instance.setSabaq(cur == parah ? null : parah);
      setState(() => _mode = _Mode.view);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final hs = HifzState.instance;
    return Scaffold(
      appBar: AppBar(title: const Text('Hifz Tracker')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _summary(hs),
          const SizedBox(height: 12),
          _planSection(hs),
          const SizedBox(height: 16),
          _modeBar(),
          const SizedBox(height: 8),
          if (_mode != _Mode.view)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Text(
                _mode == _Mode.markMemorized
                    ? 'Tap a parah to toggle whether you have memorized it.'
                    : 'Tap the parah you are currently working on (sabaq).',
                style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
              ),
            ),
          _heatmap(hs),
          const SizedBox(height: 8),
          _legend(),
        ],
      ),
    );
  }

  Widget _summary(HifzState hs) {
    return Row(
      children: [
        _chip('Memorized', '${hs.memorized.length}/30', Colors.green),
        const SizedBox(width: 8),
        _chip('Sabaq', hs.sabaq == null ? '—' : 'Parah ${hs.sabaq}', Colors.amber.shade700),
      ],
    );
  }

  Widget _chip(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label.toUpperCase(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: color,
                )),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _planSection(HifzState hs) {
    final sabaq = hs.sabaq;
    // Pick the oldest-revised memorized parah for Manzil
    int? manzil;
    if (hs.memorized.isNotEmpty) {
      final candidates = hs.memorized.toList()..removeWhere((p) => p == sabaq);
      candidates.sort((a, b) {
        final av = _activity[a] ?? '1970-01-01';
        final bv = _activity[b] ?? '1970-01-01';
        return av.compareTo(bv); // oldest first
      });
      manzil = candidates.isNotEmpty ? candidates.first : null;
    }
    final sabqiCandidates = hs.memorized.toList()
      ..removeWhere((p) => p == sabaq || p == manzil)
      ..sort((a, b) {
        final av = _activity[a] ?? '1970-01-01';
        final bv = _activity[b] ?? '1970-01-01';
        return bv.compareTo(av); // most-recent first
      });
    final sabqi = sabqiCandidates.take(2).toList();

    return Column(
      children: [
        _planTile('Sabaq', 'New lesson', sabaq, Colors.green.shade600),
        for (final p in sabqi)
          _planTile('Sabqi', 'Recent revision', p, Colors.amber.shade700),
        _planTile('Manzil', 'Long-term rotation', manzil, Colors.purple.shade400),
      ],
    );
  }

  Widget _planTile(String title, String subtitle, int? parah, Color color) {
    return Card(
      child: ListTile(
        leading: Container(
          width: 6,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3)),
        ),
        title: Text(
          parah == null ? '$title — not set' : '$title · Parah $parah',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: parah == null
            ? null
            : ElevatedButton(
                onPressed: () => context.push('/recite?parah=$parah'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: color,
                  foregroundColor: Colors.white,
                  elevation: 0,
                ),
                child: const Text('Recite'),
              ),
      ),
    );
  }

  Widget _modeBar() {
    return Wrap(
      spacing: 6,
      children: [
        for (final m in _Mode.values)
          ChoiceChip(
            label: Text(_modeLabel(m)),
            selected: _mode == m,
            onSelected: (_) => setState(() => _mode = m),
          ),
      ],
    );
  }

  String _modeLabel(_Mode m) => switch (m) {
        _Mode.view => 'View',
        _Mode.markMemorized => 'Mark memorized',
        _Mode.pickSabaq => 'Pick sabaq',
      };

  Widget _heatmap(HifzState hs) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 30,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 6,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1,
      ),
      itemBuilder: (_, i) {
        final parah = i + 1;
        final status = statusFor(parah, hs.memorized, _activity);
        final isSabaq = hs.sabaq == parah;
        final c = _statusColor(status);
        return GestureDetector(
          onTap: () => _tap(parah),
          child: Container(
            decoration: BoxDecoration(
              color: c.bg,
              borderRadius: BorderRadius.circular(10),
              border: isSabaq
                  ? Border.all(color: Theme.of(context).colorScheme.primary, width: 3)
                  : null,
            ),
            alignment: Alignment.center,
            child: Text(
              '$parah',
              style: TextStyle(
                color: c.fg,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        );
      },
    );
  }

  _Pal _statusColor(HeatStatus s) {
    switch (s) {
      case HeatStatus.fresh:
        return _Pal(Colors.green.shade500, Colors.white);
      case HeatStatus.aging:
        return _Pal(Colors.amber.shade400, Colors.amber.shade900);
      case HeatStatus.overdue:
        return _Pal(Colors.red.shade500, Colors.white);
      case HeatStatus.never:
        return _Pal(Colors.grey.shade300, Colors.grey.shade800);
      case HeatStatus.notMemorized:
        return _Pal(Colors.grey.shade100, Colors.grey.shade500);
    }
  }

  Widget _legend() {
    Widget dot(Color c, String label) => Padding(
          padding: const EdgeInsets.only(right: 12, top: 4),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(3))),
            const SizedBox(width: 5),
            Text(label, style: const TextStyle(fontSize: 11)),
          ]),
        );
    return Wrap(children: [
      dot(Colors.green.shade500, 'Fresh'),
      dot(Colors.amber.shade400, 'Aging'),
      dot(Colors.red.shade500, 'Overdue'),
      dot(Colors.grey.shade300, 'Memorized · no log'),
      dot(Colors.grey.shade100, 'Not memorized'),
    ]);
  }
}

class _Pal {
  final Color bg;
  final Color fg;
  _Pal(this.bg, this.fg);
}
