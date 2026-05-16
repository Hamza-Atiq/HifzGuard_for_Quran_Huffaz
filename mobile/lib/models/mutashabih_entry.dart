class VerseRef {
  final int surah;
  final int ayah;
  final String key;
  VerseRef({required this.surah, required this.ayah, required this.key});

  factory VerseRef.fromJson(Map<String, dynamic> j) => VerseRef(
        surah: (j['surah'] as num).toInt(),
        ayah: (j['ayah'] as num).toInt(),
        key: j['key'] as String,
      );
}

class MutashabihEntry {
  final VerseRef src;
  final List<VerseRef> similar;
  final bool needsContext;
  final int parah;
  final String? difficulty; // 'small' | 'medium' | 'large'

  MutashabihEntry({
    required this.src,
    required this.similar,
    required this.needsContext,
    required this.parah,
    this.difficulty,
  });

  factory MutashabihEntry.fromJson(Map<String, dynamic> j) => MutashabihEntry(
        src: VerseRef.fromJson(j['src'] as Map<String, dynamic>),
        similar: (j['similar'] as List? ?? [])
            .map((s) => VerseRef.fromJson(s as Map<String, dynamic>))
            .toList(),
        needsContext: (j['needsContext'] as bool?) ?? false,
        parah: (j['parah'] as num?)?.toInt() ?? 0,
        difficulty: j['difficulty'] as String?,
      );
}
