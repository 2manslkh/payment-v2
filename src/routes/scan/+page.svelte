<script lang="ts">
	import { onMount } from 'svelte';
	import jsQR from 'jsqr';
	import { ethers } from 'ethers';

	let video: HTMLVideoElement;
	let canvas: HTMLCanvasElement;
	let addressDisplay: HTMLElement;
	let scanButton: HTMLButtonElement;
	let videoContainer: HTMLElement;
	let confirmationButtons: HTMLElement;
	let scanning = false;
	let scannedAddress = '';

	function toggleScanning() {
		if (scanning) {
			stopScanning();
		} else {
			startScanning();
		}
	}

	async function startScanning() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});
			video.srcObject = stream;
			video.setAttribute('playsinline', true);
			video.play();
			scanning = true;
			scanButton.textContent = 'Cancel';
			videoContainer.style.display = 'block';
			addressDisplay.style.display = 'none';
			confirmationButtons.style.display = 'none';
			requestAnimationFrame(tick);
		} catch (err) {
			console.error('Error accessing the camera:', err);
			addressDisplay.textContent = 'Camera access error. Check permissions and try again.';
			addressDisplay.style.display = 'block';
		}
	}

	function stopScanning() {
		const stream = video.srcObject;
		if (stream) {
			const tracks = stream.getTracks();
			tracks.forEach((track) => track.stop());
			video.srcObject = null;
		}
		scanning = false;
		scanButton.textContent = 'Start Scan';
		videoContainer.style.display = 'none';
	}

	function tick() {
		if (video.readyState === video.HAVE_ENOUGH_DATA) {
			canvas.height = video.videoHeight;
			canvas.width = video.videoWidth;
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
			const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
			const code = jsQR(imageData.data, imageData.width, imageData.height, {
				inversionAttempts: 'dontInvert'
			});
			if (code) {
				handleQRCode(code.data);
			}
		}
		if (scanning) {
			requestAnimationFrame(tick);
		}
	}

	function handleQRCode(data) {
		if (ethers.utils.isAddress(data)) {
			scannedAddress = data;
			addressDisplay.textContent = `Recipient: ${data}`;
			addressDisplay.style.display = 'block';
			stopScanning();
			scanButton.style.display = 'none';
			confirmationButtons.style.display = 'flex';
		} else {
			addressDisplay.textContent = 'Invalid Ethereum address. Try again.';
			addressDisplay.style.display = 'block';
			// Add a short timeout to clear the error message
			setTimeout(() => {
				addressDisplay.textContent = '';
				addressDisplay.style.display = 'none';
			}, 3000);
		}
	}

	function resetScanner() {
		scannedAddress = '';
		addressDisplay.style.display = 'none';
		confirmationButtons.style.display = 'none';
		scanButton.style.display = 'block';
		scanButton.textContent = 'Start Scan';
	}

	function proceedToMerchant() {
		if (scannedAddress) {
			window.location.href = `/merchant?address=${scannedAddress}`;
		}
	}

	$: if (scanning) {
		scanButton.textContent = 'Cancel';
		videoContainer.style.display = 'block';
		addressDisplay.style.display = 'none';
		confirmationButtons.style.display = 'none';
	} else {
		scanButton.textContent = 'Start Scan';
		videoContainer.style.display = 'none';
	}
</script>

<svelte:head>
	<title>EasyPay - Scan Recipient Address</title>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="container">
	<h1>Scan Recipient Address</h1>
	<p class="tagline">Scan the QR code to get the recipient's Ethereum address.</p>
	<div id="videoContainer" bind:this={videoContainer}>
		<video id="qr-video" bind:this={video} playsinline></video>
	</div>
	<canvas id="qr-canvas" bind:this={canvas}></canvas>
	<div id="addressDisplay" bind:this={addressDisplay}></div>
	<button id="scanButton" class="button" on:click={toggleScanning} bind:this={scanButton}
		>Start Scan</button
	>
	<div id="confirmationButtons" bind:this={confirmationButtons}>
		<button id="cancelButton" class="button secondary" on:click={resetScanner}>Cancel</button>
		<button id="continueButton" class="button" on:click={proceedToMerchant}>Continue</button>
	</div>
</div>

<style>
	:global(body) {
		font-family: 'Inter', sans-serif;
		margin: 0;
		padding: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #e9f0ff, #1652f0);
	}
	.container {
		background: #ffffff;
		border-radius: 20px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
		padding: 40px;
		width: 90%;
		max-width: 500px;
		text-align: center;
	}
	h1 {
		color: #05195a;
		margin-bottom: 10px;
	}
	.tagline {
		color: #4a4a4a;
		margin-bottom: 30px;
		font-size: 16px;
	}
	#videoContainer {
		position: relative;
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
		display: none;
	}
	#qr-video {
		width: 100%;
		border-radius: 10px;
	}
	#qr-canvas {
		display: none;
	}
	#addressDisplay {
		margin-top: 20px;
		padding: 15px;
		background: #f3f3f3;
		border-radius: 10px;
		font-size: 16px;
		word-break: break-all;
		display: none;
	}
	.button {
		margin-top: 20px;
		padding: 15px 30px;
		background: #1652f0;
		color: #ffffff;
		border: none;
		border-radius: 5px;
		font-size: 18px;
		cursor: pointer;
		transition: background 0.3s ease;
	}
	.button:hover {
		background: #0a46e4;
	}
	.button.secondary {
		background: #f3f3f3;
		color: #05195a;
	}
	.button.secondary:hover {
		background: #e0e0e0;
	}
	.hidden {
		display: none !important;
	}
	#confirmationButtons {
		display: none;
		justify-content: space-between;
		margin-top: 20px;
	}
	#confirmationButtons .button {
		width: 48%;
	}
</style>
