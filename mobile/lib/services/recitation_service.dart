import 'dart:async';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:permission_handler/permission_handler.dart';

import '../api/client.dart';

/// Continuously records mic audio in fixed-length chunks, ships each one to
/// the server for Whisper transcription, and emits an event with the latest
/// running transcript so the UI can match it word-by-word against the
/// expected verse.
class RecitationService {
  final _recorder = AudioRecorder();
  final Duration chunkDuration;
  final _events = StreamController<RecitationEvent>.broadcast();
  bool _running = false;
  String _transcript = '';
  String? _verseText; // current expected verse — sent as initial_prompt to Groq

  RecitationService({this.chunkDuration = const Duration(seconds: 4)});

  Stream<RecitationEvent> get events => _events.stream;
  String get transcript => _transcript;
  bool get isRunning => _running;

  Future<bool> _ensureMic() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  /// [verseText] is the Arabic text of the verse the user is reciting.
  /// It is sent to the backend as initial_prompt for Groq Whisper so the model
  /// stays in Arabic and avoids hallucinating English words.
  Future<void> start({String? verseText}) async {
    if (_running) return;
    final ok = await _ensureMic();
    if (!ok) {
      _events.add(RecitationEvent.error('Microphone permission denied'));
      return;
    }
    _verseText = verseText;
    _transcript = '';
    _running = true;
    _events.add(RecitationEvent.listening());
    _cycle(); // fire and forget
  }

  /// Call this when the user moves to a different verse while still recording.
  void updateVerseText(String? verseText) {
    _verseText = verseText;
    _transcript = ''; // reset accumulated transcript for new verse
  }

  Future<void> stop() async {
    _running = false;
    try {
      if (await _recorder.isRecording()) {
        await _recorder.stop();
      }
    } catch (_) {}
    _events.add(RecitationEvent.stopped());
  }

  Future<void> _cycle() async {
    while (_running) {
      try {
        final dir = await getTemporaryDirectory();
        final path = '${dir.path}/hifzguard_chunk_${DateTime.now().microsecondsSinceEpoch}.m4a';
        await _recorder.start(
          const RecordConfig(
            encoder: AudioEncoder.aacLc,
            bitRate: 64000,
            sampleRate: 16000,
            numChannels: 1,
          ),
          path: path,
        );
        await Future.delayed(chunkDuration);
        if (!_running) {
          if (await _recorder.isRecording()) await _recorder.stop();
          break;
        }
        final filePath = await _recorder.stop();
        if (filePath == null) continue;

        // Fire transcription in parallel — don't block the next cycle
        unawaited(_transcribeFile(filePath, _verseText));
      } catch (e) {
        _events.add(RecitationEvent.error(e.toString()));
        await Future.delayed(const Duration(milliseconds: 500));
      }
    }
  }

  Future<void> _transcribeFile(String path, String? verseText) async {
    try {
      final file = File(path);
      if (!await file.exists()) return;
      final bytes = await file.readAsBytes();
      final text = await ApiClient.instance.transcribeChunk(
        bytes,
        'audio/m4a',
        verseText: verseText,
      );
      await file.delete().catchError((_) => file);
      _transcript = (_transcript + ' ' + text).trim();
      _events.add(RecitationEvent.chunk(text, _transcript));
    } catch (e) {
      _events.add(RecitationEvent.error('Transcribe failed: $e'));
    }
  }

  void dispose() {
    stop();
    _events.close();
    _recorder.dispose();
  }
}

class RecitationEvent {
  final RecitationEventType type;
  final String? text;
  final String? fullTranscript;
  final String? errorMessage;

  RecitationEvent._(this.type, {this.text, this.fullTranscript, this.errorMessage});

  factory RecitationEvent.listening() => RecitationEvent._(RecitationEventType.listening);
  factory RecitationEvent.chunk(String text, String full) =>
      RecitationEvent._(RecitationEventType.chunk, text: text, fullTranscript: full);
  factory RecitationEvent.stopped() => RecitationEvent._(RecitationEventType.stopped);
  factory RecitationEvent.error(String message) =>
      RecitationEvent._(RecitationEventType.error, errorMessage: message);
}

enum RecitationEventType { listening, chunk, stopped, error }
