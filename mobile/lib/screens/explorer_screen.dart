import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/client.dart';
import '../models/mutashabih_entry.dart';

class ExplorerScreen extends StatefulWidget {
  const ExplorerScreen({super.key, this.initialParah = 1});
  final int initialParah;

  @override
  State<ExplorerScreen> createState() => _ExplorerScreenState();
}

class _ExplorerScreenState extends State<ExplorerScreen> {
  late int _parah = widget.initialParah;
  Future<List<MutashabihEntry>>? _future;
  String _difficulty = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = ApiClient.instance.fetchMutashabihatByParah(_parah);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Parah $_parah'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: Column(
        children: [
          _parahSelector(),
          _difficultyFilter(),
          Expanded(
            child: FutureBuilder<List<MutashabihEntry>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  return Center(child: Text('Error: ${snap.error}'));
                }
                final all = snap.data ?? [];
                final filtered = _difficulty == 'all'
                    ? all
                    : all.where((e) => (e.difficulty ?? 'small') == _difficulty).toList();
                if (filtered.isEmpty) {
                  return const Center(child: Text('No mutashabihat in this parah at this difficulty.'));
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _EntryCard(entry: filtered[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _parahSelector() {
    return SizedBox(
      height: 56,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: 30,
        itemBuilder: (_, i) {
          final n = i + 1;
          final selected = n == _parah;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
            child: ChoiceChip(
              label: Text('$n'),
              selected: selected,
              onSelected: (_) {
                setState(() {
                  _parah = n;
                  _load();
                });
              },
            ),
          );
        },
      ),
    );
  }

  Widget _difficultyFilter() {
    final opts = ['all', 'small', 'medium', 'large'];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (final o in opts) ...[
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: FilterChip(
                label: Text(o[0].toUpperCase() + o.substring(1)),
                selected: _difficulty == o,
                onSelected: (_) => setState(() => _difficulty = o),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({required this.entry});
  final MutashabihEntry entry;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final diff = entry.difficulty ?? 'small';
    final diffColor = switch (diff) {
      'large' => Colors.red.shade400,
      'medium' => Colors.amber.shade600,
      _ => Colors.green.shade500,
    };
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.push('/compare/${entry.src.key}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    entry.src.key,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: colors.primary,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: diffColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${entry.similar.length} similar · ${diff[0].toUpperCase()}${diff.substring(1)}',
                      style: TextStyle(fontSize: 11, color: diffColor.withValues(alpha: 1.0)),
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.chevron_right, size: 18, color: Colors.black38),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Similar to: ${entry.similar.map((s) => s.key).join(' · ')}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.black54),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
