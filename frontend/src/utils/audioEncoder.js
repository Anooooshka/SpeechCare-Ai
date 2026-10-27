/**
 * Converts any browser audio blob (WebM, Opus, OGG, AAC) into a standard 16 kHz mono WAV file.
 */
export async function convertBlobToWav(blob, targetSampleRate = 16000) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Decode audio data to PCM AudioBuffer
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  // Resample to targetSampleRate and mono using OfflineAudioContext
  const numberOfChannels = 1;
  const lengthInSamples = Math.ceil(audioBuffer.duration * targetSampleRate);
  const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
    numberOfChannels,
    lengthInSamples,
    targetSampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  await audioCtx.close();

  // Encode PCM data into standard 16-bit WAV RIFF format
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  return wavBlob;
}

function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const samplesCount = channelData.length;
  
  // 16-bit linear PCM
  const bytesPerSample = 2;
  const blockAlign = numOfChan * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samplesCount * blockAlign;
  const bufferLength = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // Write RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 for PCM)
  view.setUint16(22, numOfChan, true);   // NumChannels
  view.setUint32(24, sampleRate, true);  // SampleRate
  view.setUint32(28, byteRate, true);    // ByteRate
  view.setUint16(32, blockAlign, true);  // BlockAlign
  view.setUint16(34, 16, true);          // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples (clamp to [-1, 1] and convert to 16-bit int)
  let offset = 44;
  for (let i = 0; i < samplesCount; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
