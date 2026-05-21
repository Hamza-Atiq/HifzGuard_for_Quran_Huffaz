/// Arabic-aware text normalization + LCS diff, ported 1:1 from the web
/// project's `src/lib/diff.ts` so the matcher produces identical results
/// in mobile and on the web.
///
/// Normalization order matters — see inline comments.

final _silentWaw = RegExp('وٰ'); // وٰ (waw + superscript alef)
final _tashkeel = RegExp('[ً-ٰٟۖ-ۭـ]');
final _alifVariants = RegExp('[آأإٱ]'); // آأإٱ

String normalize(String word) {
  return word
      // 1. Uthmanic silent waw (وٰ) → bare alif — must be BEFORE tashkeel strip
      //    because U+0670 (superscript alef after waw) gets stripped next.
      //    Covers الصَّلَوٰةَ → الصلاة, الزَّكَوٰةَ → الزكاة, الحَيَوٰةَ → الحياة
      .replaceAll(_silentWaw, 'ا')
      .replaceAll(_tashkeel, '')
      .replaceAll(_alifVariants, 'ا') // alif variants + alef wasla → bare alif
      .replaceAll('ة', 'ه') // ta marbuta → ha
      .replaceAll('ى', 'ي') // alif maqsura → ya
      .trim();
}

enum WordStatus { same, diff, extra }

class DiffWord {
  final String text;
  final WordStatus status;
  DiffWord(this.text, this.status);
}

class DiffResult {
  final List<DiffWord> left;
  final List<DiffWord> right;
  DiffResult(this.left, this.right);
}

/// LCS-based word-level diff between two Arabic verses.
DiffResult diffVerses(List<String> a, List<String> b) {
  final n = a.length;
  final m = b.length;
  final dp = List.generate(n + 1, (_) => List<int>.filled(m + 1, 0));
  for (var i = 1; i <= n; i++) {
    for (var j = 1; j <= m; j++) {
      if (normalize(a[i - 1]) == normalize(b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = dp[i - 1][j] > dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
      }
    }
  }

  final left = <DiffWord>[];
  final right = <DiffWord>[];
  var i = n, j = m;
  while (i > 0 && j > 0) {
    if (normalize(a[i - 1]) == normalize(b[j - 1])) {
      left.insert(0, DiffWord(a[i - 1], WordStatus.same));
      right.insert(0, DiffWord(b[j - 1], WordStatus.same));
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      left.insert(0, DiffWord(a[i - 1], WordStatus.diff));
      i--;
    } else {
      right.insert(0, DiffWord(b[j - 1], WordStatus.diff));
      j--;
    }
  }
  while (i > 0) {
    left.insert(0, DiffWord(a[i - 1], WordStatus.extra));
    i--;
  }
  while (j > 0) {
    right.insert(0, DiffWord(b[j - 1], WordStatus.extra));
    j--;
  }
  return DiffResult(left, right);
}

/// Walk through the expected verse word-by-word, looking for each word in
/// the transcript in-order. Returns -1 if the user completed the verse OK,
/// otherwise the index of the first expected-word they diverged on.
///
/// Stops early when the transcript runs out (frontier guard) — words the user
/// hasn't reached yet are not flagged as errors.
int findDivergenceIndex(
  String transcript,
  String expected, {
  int lookahead = 4,
  int tolerateMisses = 1,
}) {
  final t = transcript.split(RegExp(r'\s+')).map(normalize).where((s) => s.isNotEmpty).toList();
  final e = expected.split(RegExp(r'\s+')).map(normalize).where((s) => s.isNotEmpty).toList();
  var ti = 0;
  var consecutiveMisses = 0;
  for (var ei = 0; ei < e.length; ei++) {
    if (ti >= t.length) break; // transcript exhausted — not an error yet
    var hitAt = -1;
    for (var k = 0; k < lookahead && ti + k < t.length; k++) {
      if (t[ti + k] == e[ei]) {
        hitAt = ti + k;
        break;
      }
    }
    if (hitAt >= 0) {
      ti = hitAt + 1;
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
      if (consecutiveMisses > tolerateMisses) return ei;
    }
  }
  return -1;
}

int matchedCount(String transcript, String expected, {int lookahead = 4}) {
  final t = transcript.split(RegExp(r'\s+')).map(normalize).where((s) => s.isNotEmpty).toList();
  final e = expected.split(RegExp(r'\s+')).map(normalize).where((s) => s.isNotEmpty).toList();
  var ti = 0;
  var matched = 0;
  for (final word in e) {
    for (var k = 0; k < lookahead && ti + k < t.length; k++) {
      if (t[ti + k] == word) {
        ti = ti + k + 1;
        matched++;
        break;
      }
    }
  }
  return matched;
}

/// Score how well a transcript matches a candidate verse. 0..1 fraction.
double scoreMatch(String transcript, String candidate) {
  final tWords = transcript.split(RegExp(r'\s+')).map(normalize).where((s) => s.isNotEmpty).toList();
  final cWords = candidate.split(RegExp(r'\s+')).map(normalize).where((s) => s.isNotEmpty).toList();
  if (cWords.isEmpty) return 0;
  var ti = 0;
  var matched = 0;
  for (final w in cWords) {
    for (var k = 0; k < 4 && ti + k < tWords.length; k++) {
      if (tWords[ti + k] == w) {
        ti = ti + k + 1;
        matched++;
        break;
      }
    }
  }
  return matched / cWords.length;
}
