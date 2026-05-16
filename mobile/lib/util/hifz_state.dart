import 'package:shared_preferences/shared_preferences.dart';

const _kMemorizedKey = 'hifzguard.memorized_parahs';
const _kSabaqKey = 'hifzguard.sabaq_parah';
const _kActivityPrefix = 'hifzguard.activity_';

/// Local-only hifz state. Mirrors the web app's localStorage shape so a future
/// device-login flow can sync without data loss.
class HifzState {
  HifzState._();
  static final HifzState instance = HifzState._();

  Set<int> _memorized = {};
  int? _sabaq;

  Future<void> hydrate() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getStringList(_kMemorizedKey) ?? const [];
    _memorized = raw.map(int.tryParse).whereType<int>().toSet();
    _sabaq = p.getInt(_kSabaqKey);
  }

  Set<int> get memorized => _memorized;
  int? get sabaq => _sabaq;

  Future<void> toggleMemorized(int parah) async {
    final p = await SharedPreferences.getInstance();
    if (_memorized.contains(parah)) {
      _memorized.remove(parah);
    } else {
      _memorized.add(parah);
    }
    await p.setStringList(_kMemorizedKey, _memorized.map((e) => '$e').toList()..sort());
  }

  Future<void> setSabaq(int? parah) async {
    final p = await SharedPreferences.getInstance();
    _sabaq = parah;
    if (parah == null) {
      await p.remove(_kSabaqKey);
    } else {
      await p.setInt(_kSabaqKey, parah);
    }
  }

  /// Record that the user touched some verses for the parah today.
  /// Stored as a map of parah → most-recent ISO date.
  Future<void> logRevision(int parah) async {
    final p = await SharedPreferences.getInstance();
    final today = DateTime.now().toIso8601String().substring(0, 10);
    await p.setString('$_kActivityPrefix$parah', today);
  }

  Future<Map<int, String>> readActivity() async {
    final p = await SharedPreferences.getInstance();
    final map = <int, String>{};
    for (var n = 1; n <= 30; n++) {
      final v = p.getString('$_kActivityPrefix$n');
      if (v != null) map[n] = v;
    }
    return map;
  }
}

enum HeatStatus { fresh, aging, overdue, never, notMemorized }

HeatStatus statusFor(int parah, Set<int> memorized, Map<int, String> activity, [DateTime? now]) {
  if (!memorized.contains(parah)) return HeatStatus.notMemorized;
  final isoToday = (now ?? DateTime.now()).toIso8601String().substring(0, 10);
  final last = activity[parah];
  if (last == null) return HeatStatus.never;
  final lastDate = DateTime.parse(last);
  final daysAgo = DateTime.parse(isoToday).difference(lastDate).inDays;
  if (daysAgo <= 3) return HeatStatus.fresh;
  if (daysAgo <= 14) return HeatStatus.aging;
  return HeatStatus.overdue;
}
