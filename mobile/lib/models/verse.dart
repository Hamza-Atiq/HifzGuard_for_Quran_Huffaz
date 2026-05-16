class Word {
  final int position;
  final String text;
  final String? translation;

  Word({required this.position, required this.text, this.translation});

  factory Word.fromJson(Map<String, dynamic> j) => Word(
        position: (j['position'] as num?)?.toInt() ?? 0,
        text: j['text'] as String? ?? '',
        translation: j['translation'] as String?,
      );
}

class Verse {
  final String key;
  final int surah;
  final int ayah;
  final String textUthmani;
  final List<Word> words;
  final String? translation;
  final String? surahName;

  Verse({
    required this.key,
    required this.surah,
    required this.ayah,
    required this.textUthmani,
    required this.words,
    this.translation,
    this.surahName,
  });

  factory Verse.fromJson(Map<String, dynamic> j) => Verse(
        key: j['key'] as String,
        surah: (j['surah'] as num).toInt(),
        ayah: (j['ayah'] as num).toInt(),
        textUthmani: j['textUthmani'] as String? ?? '',
        words: (j['words'] as List? ?? [])
            .map((w) => Word.fromJson(w as Map<String, dynamic>))
            .toList(),
        translation: j['translation'] as String?,
        surahName: j['surahName'] as String?,
      );
}
