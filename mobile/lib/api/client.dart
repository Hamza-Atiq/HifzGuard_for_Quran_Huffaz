import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

import '../models/verse.dart';
import '../models/mutashabih_entry.dart';

/// Single source of truth for the deployed backend URL.
/// Override at build time with `--dart-define=API_BASE_URL=https://...`
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://hifz-guard.vercel.app',
);

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => 'ApiException($status): $message';
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse(kApiBaseUrl);
    return base.replace(
      path: '${base.path}$path'.replaceAll('//', '/'),
      queryParameters: query,
    );
  }

  Future<List<Verse>> fetchVerses(List<String> keys) async {
    if (keys.isEmpty) return [];
    final res = await http.get(_uri('/api/quran/verses', {'keys': keys.join(',')}));
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, 'fetchVerses failed');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final list = (body['verses'] as List? ?? []);
    return list.map((j) => Verse.fromJson(j as Map<String, dynamic>)).toList();
  }

  /// Get the mutashabihat entries for a parah (1..30).
  Future<List<MutashabihEntry>> fetchMutashabihatByParah(int parah) async {
    final res = await http.get(_uri('/api/mutashabihat', {'parah': '$parah'}));
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, 'fetchMutashabihat failed');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final list = (body['entries'] as List? ?? []);
    return list.map((j) => MutashabihEntry.fromJson(j as Map<String, dynamic>)).toList();
  }

  /// Get the mutashabihat entry for a specific verse, or null if none.
  Future<MutashabihEntry?> fetchMutashabihForVerse(String verseKey) async {
    final res = await http.get(_uri('/api/mutashabihat', {'key': verseKey}));
    if (res.statusCode != 200) return null;
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final entry = body['entry'];
    if (entry == null) return null;
    return MutashabihEntry.fromJson(entry as Map<String, dynamic>);
  }

  /// Send a recorded audio chunk for Whisper transcription.
  /// [audio] must be raw bytes of an audio file (mp4/m4a/wav supported).
  /// [verseText] is the Arabic text of the verse being recited — passed as
  /// initial_prompt to Groq/Whisper to prevent English hallucinations.
  Future<String> transcribeChunk(
    Uint8List audio,
    String mimeType, {
    String? verseText,
  }) async {
    final headers = <String, String>{'Content-Type': mimeType};
    if (verseText != null && verseText.isNotEmpty) {
      headers['x-verse-text'] = verseText;
    }
    final res = await http.post(
      _uri('/api/recitation/transcribe'),
      headers: headers,
      body: audio,
    );
    if (res.statusCode != 200) {
      throw ApiException(res.statusCode, 'transcribe: ${res.body}');
    }
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return body['text'] as String? ?? '';
  }
}
