import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/home_screen.dart';
import 'screens/explorer_screen.dart';
import 'screens/compare_screen.dart';
import 'screens/recite_screen.dart';
import 'screens/hifz_screen.dart';

void main() {
  runApp(const HifzGuardApp());
}

final _router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(
      path: '/explorer',
      builder: (_, state) => ExplorerScreen(
        initialParah: int.tryParse(state.uri.queryParameters['parah'] ?? '') ?? 1,
      ),
    ),
    GoRoute(
      path: '/compare/:verseKey',
      builder: (_, state) => CompareScreen(
        sourceKey: state.pathParameters['verseKey']!,
      ),
    ),
    GoRoute(
      path: '/recite',
      builder: (_, state) => ReciteScreen(
        initialParah: int.tryParse(state.uri.queryParameters['parah'] ?? '') ?? 1,
      ),
    ),
    GoRoute(path: '/hifz', builder: (_, __) => const HifzScreen()),
  ],
);

class HifzGuardApp extends StatelessWidget {
  const HifzGuardApp({super.key});

  @override
  Widget build(BuildContext context) {
    const teal = Color(0xFF0F766E);
    return MaterialApp.router(
      title: 'HifzGuard',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: ColorScheme.fromSeed(seedColor: teal, brightness: Brightness.light),
        scaffoldBackgroundColor: const Color(0xFFFBFAF7),
        textTheme: const TextTheme().apply(fontFamily: 'sans-serif'),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFFBFAF7),
          surfaceTintColor: Colors.transparent,
          centerTitle: false,
          elevation: 0,
        ),
        cardTheme: CardTheme(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0xFFE7E5DF), width: 1),
          ),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(seedColor: teal, brightness: Brightness.dark),
      ),
      themeMode: ThemeMode.system,
      routerConfig: _router,
    );
  }
}
