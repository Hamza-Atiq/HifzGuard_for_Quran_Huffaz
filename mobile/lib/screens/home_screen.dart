import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tiles = [
      _Tile('Recite', 'Mic-driven recitation with mistake beep', Icons.mic, '/recite', isPrimary: true),
      _Tile('Explorer', 'Browse mutashabihat by parah', Icons.menu_book_outlined, '/explorer'),
      _Tile('Hifz Tracker', 'Sabaq / Sabqi / Manzil plan + heatmap', Icons.calendar_today_outlined, '/hifz'),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('HifzGuard', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        children: [
          const SizedBox(height: 8),
          Text(
            'Master the verses\nyou keep confusing.',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'A companion for Huffaz built around the mutashabihat — the similar verses scattered through the Quran that trip up every memorizer.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
          ),
          const SizedBox(height: 24),
          for (final t in tiles) ...[
            _FeatureCard(tile: t),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This is the mobile companion. Sign-in for bookmarks, streaks and dashboard is in the web app: hifz-guard.vercel.app',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Tile {
  final String title;
  final String subtitle;
  final IconData icon;
  final String route;
  final bool isPrimary;
  _Tile(this.title, this.subtitle, this.icon, this.route, {this.isPrimary = false});
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({required this.tile});
  final _Tile tile;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.push(tile.route),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: tile.isPrimary ? colors.primary : colors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  tile.icon,
                  color: tile.isPrimary ? Colors.white : colors.primary,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tile.title,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tile.subtitle,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: Colors.black54),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.black38),
            ],
          ),
        ),
      ),
    );
  }
}
