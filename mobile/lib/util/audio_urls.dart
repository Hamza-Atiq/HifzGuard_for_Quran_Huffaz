/// Verse audio URL builder, mirroring `src/lib/audio.ts` from the web.

class Reciter {
  final String id;
  final String name;
  final String folder;
  const Reciter(this.id, this.name, this.folder);
}

const List<Reciter> kReciters = [
  Reciter('mishary', 'Mishary Al-Afasy', 'Alafasy_128kbps'),
  Reciter('husary', 'Mahmoud Al-Husary', 'Husary_128kbps'),
  Reciter('husary-mujawwad', 'Al-Husary (Mujawwad)', 'Husary_Mujawwad_64kbps'),
  Reciter('abdulbasit', 'Abdul Basit (Murattal)', 'Abdul_Basit_Murattal_64kbps'),
  Reciter('abdulbasit-mujawwad', 'Abdul Basit (Mujawwad)', 'Abdul_Basit_Mujawwad_128kbps'),
  Reciter('shuraim', 'Saud Al-Shuraim', 'Saood_ash-Shuraym_128kbps'),
  Reciter('sudais', 'Abdul Rahman Al-Sudais', 'Abdurrahmaan_As-Sudais_192kbps'),
  Reciter('maher', 'Maher Al-Muaiqly', 'MaherAlMuaiqly128kbps'),
];

Reciter reciterById(String id) =>
    kReciters.firstWhere((r) => r.id == id, orElse: () => kReciters.first);

String _pad3(int n) => n.toString().padLeft(3, '0');

String audioUrlFor(String verseKey, String reciterId) {
  final parts = verseKey.split(':');
  final s = int.parse(parts[0]);
  final a = int.parse(parts[1]);
  final r = reciterById(reciterId);
  return 'https://everyayah.com/data/${r.folder}/${_pad3(s)}${_pad3(a)}.mp3';
}
