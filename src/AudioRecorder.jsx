import { useState, useRef } from "react";
import lamejs from 'lamejs';
const mimeType = "audio/webm";

const AudioRecorder = () => {
	const [permission, setPermission] = useState(false);

	const mediaRecorder = useRef(null);

	const [recordingStatus, setRecordingStatus] = useState("inactive");

	const [stream, setStream] = useState(null);

	const [audio, setAudio] = useState(null);

	const [audioMp3, setAudioMp3] = useState(null);

	const [audioChunks, setAudioChunks] = useState([]);

	const getMicrophonePermission = async () => {
		if ("MediaRecorder" in window) {
			try {
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: false,
				});
				setPermission(true);
				setStream(mediaStream);
			} catch (err) {
				alert(err.message);
			}
		} else {
			alert("The MediaRecorder API is not supported in your browser.");
		}
	};

	const startRecording = async () => {
		setRecordingStatus("recording");
		const media = new MediaRecorder(stream, { type: mimeType });

		mediaRecorder.current = media;

		mediaRecorder.current.start();

		let localAudioChunks = [];

		mediaRecorder.current.ondataavailable = (event) => {
			if (typeof event.data === "undefined") return;
			if (event.data.size === 0) return;
			localAudioChunks.push(event.data);
		};
		console.log("LOCAL", localAudioChunks)
		setAudioChunks(localAudioChunks);
	};

	const stopRecording = () => {
		setRecordingStatus("inactive");
		mediaRecorder.current.stop();
		console.log("chunks", audioChunks)

		mediaRecorder.current.onstop = () => {
			budega()
			const audioBlob = new Blob(audioChunks, { type: mimeType });
			const audioUrl = URL.createObjectURL(audioBlob);
			console.log("Audio url", audioUrl)
			setAudio(audioUrl);

			setAudioChunks([]);
		};
	};
	let AudioFormat = "MP3"

	function budega() {
		if (AudioFormat === "MP3" || AudioFormat === "WAV") {
			var data = audioChunks[0];
			var blob = new Blob(audioChunks, { type: "video/webm" });
		
			const audioContext = new AudioContext();
			const fileReader = new FileReader();
		
			// Set up file reader on loaded end event
			fileReader.onloadend = () => {
			  const arrayBuffer = fileReader.result; // as ArrayBuffer;
		
			  // Convert array buffer into audio buffer
			  audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
				// Do something with audioBuffer
				console.log(audioBuffer);
				var MP3Blob = audioBufferToWav(audioBuffer);
				// console.log("iuiiu", MP3Blob)
				// setAudioMp3(MP3Blob)
			  });
			};
		
			//Load blob
			fileReader.readAsArrayBuffer(blob);
		  } else {
			var data = this.chunks[0];
			var blob = new Blob(this.chunks, { type: "audio/mpeg" });
			onStop(blob, data);
		  }
	}

	function audioBufferToWav(aBuffer) {
		let numOfChan = aBuffer.numberOfChannels,
		  btwLength = aBuffer.length * numOfChan * 2 + 44,
		  btwArrBuff = new ArrayBuffer(btwLength),
		  btwView = new DataView(btwArrBuff),
		  btwChnls = [],
		  btwIndex,
		  btwSample,
		  btwOffset = 0,
		  btwPos = 0;
		setUint32(0x46464952); // "RIFF"
		setUint32(btwLength - 8); // file length - 8
		setUint32(0x45564157); // "WAVE"
		setUint32(0x20746d66); // "fmt " chunk
		setUint32(16); // length = 16
		setUint16(1); // PCM (uncompressed)
		setUint16(numOfChan);
		setUint32(aBuffer.sampleRate);
		setUint32(aBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
		setUint16(numOfChan * 2); // block-align
		setUint16(16); // 16-bit
		setUint32(0x61746164); // "data" - chunk
		setUint32(btwLength - btwPos - 4); // chunk length
	  
		for (btwIndex = 0; btwIndex < aBuffer.numberOfChannels; btwIndex++)
		  btwChnls.push(aBuffer.getChannelData(btwIndex));
	  
		while (btwPos < btwLength) {
		  for (btwIndex = 0; btwIndex < numOfChan; btwIndex++) {
			// interleave btwChnls
			btwSample = Math.max(-1, Math.min(1, btwChnls[btwIndex][btwOffset])); // clamp
			btwSample =
			  (0.5 + btwSample < 0 ? btwSample * 32768 : btwSample * 32767) | 0; // scale to 16-bit signed int
			btwView.setInt16(btwPos, btwSample, true); // write 16-bit sample
			btwPos += 2;
		  }
		  btwOffset++; // next source sample
		}
	  
		let wavHdr = lamejs.WavHeader.readHeader(new DataView(btwArrBuff));
	  
		//Stereo
		let data = new Int16Array(btwArrBuff, wavHdr.dataOffset, wavHdr.dataLen / 2);
		let leftData = [];
		let rightData = [];
		for (let i = 0; i < data.length; i += 2) {
		  leftData.push(data[i]);
		  rightData.push(data[i + 1]);
		}
		var left = new Int16Array(leftData);
		var right = new Int16Array(rightData);
	  
		if (AudioFormat === "MP3") {
		  //STEREO
		  if (wavHdr.channels === 2)
			return wavToMp3Stereo(
			  wavHdr.channels,
			  wavHdr.sampleRate,
			  left,
			  right,
			);
		  //MONO
		  else if (wavHdr.channels === 1)
			return wavToMp3(wavHdr.channels, wavHdr.sampleRate, data);
		} else return new Blob([btwArrBuff], { type: "audio/wav" });
	  
		function setUint16(data) {
		  btwView.setUint16(btwPos, data, true);
		  btwPos += 2;
		}
	  
		function setUint32(data) {
		  btwView.setUint32(btwPos, data, true);
		  btwPos += 4;
		}
	  }

	  function wavToMp3(channels, sampleRate, left, right = null) {
		var buffer = [];
		var mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128);
		var remaining = left.length;
		var samplesPerFrame = 1152;
	  
		for (var i = 0; remaining >= samplesPerFrame; i += samplesPerFrame) {
		  if (!right) {
			var mono = left.subarray(i, i + samplesPerFrame);
			var mp3buf = mp3enc.encodeBuffer(mono);
		  } else {
			var leftChunk = left.subarray(i, i + samplesPerFrame);
			var rightChunk = right.subarray(i, i + samplesPerFrame);
			var mp3buf = mp3enc.encodeBuffer(leftChunk, rightChunk);
		  }
		  if (mp3buf.length > 0) {
			buffer.push(mp3buf); //new Int8Array(mp3buf));
		  }
		  remaining -= samplesPerFrame;
		}
		var d = mp3enc.flush();
		if (d.length > 0) {
		  buffer.push(new Int8Array(d));
		}
	  
		var mp3Blob = new Blob(buffer, { type: "audio/mp3" });
		var bUrl = window.URL.createObjectURL(mp3Blob);
	  
		// send the download link to the console
		console.log('mp3 download:', bUrl);
		setAudioMp3(bUrl)
		return mp3Blob;
	  }
	  

	return (
		<div>
			<h2>Audio Recorder</h2>
			<main>
				<div className="audio-controls">
					{!permission ? (
						<button onClick={getMicrophonePermission} type="button">
							Get Microphone
						</button>
					) : null}
					{permission && recordingStatus === "inactive" ? (
						<button onClick={startRecording} type="button">
							Start Recording
						</button>
					) : null}
					{recordingStatus === "recording" ? (
						<button onClick={stopRecording} type="button">
							Stop Recording
						</button>
					) : null}
				</div>
				{audio ? (
					<>
					<div className="audio-player">
						<audio src={audio} controls></audio>
						<a download href={audio}>
							Download Recording
						</a>
					</div>
					<div className="audio-player">
						<audio src={audioMp3} controls></audio>
						<a download href={audioMp3}>
							Download RecordingMP3
						</a>
					</div>
					</>
				) : null}
			</main>
		</div>
	);
};

export default AudioRecorder;
