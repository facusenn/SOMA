<script>
	import { onMount } from 'svelte';
	import Icon from '$lib/Icon.svelte';
	import { avisar } from '$lib/toast.svelte.js';

	let { compacto = false } = $props();
	let evento = $state(null);
	let ios = $state(false);
	let instalada = $state(true);

	onMount(() => {
		instalada = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
		ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
		if (window.__somaInstalar) evento = window.__somaInstalar;
		const guardar = (e) => {
			e.preventDefault();
			evento = e;
		};
		const listo = () => {
			instalada = true;
			evento = null;
			avisar('Ya la tenés en tu pantalla de inicio.', 'ok', { titulo: 'SOMA quedó instalada' });
		};
		addEventListener('beforeinstallprompt', guardar);
		addEventListener('appinstalled', listo);
		return () => {
			removeEventListener('beforeinstallprompt', guardar);
			removeEventListener('appinstalled', listo);
		};
	});

	async function instalar() {
		if (evento) {
			evento.prompt();
			const { outcome } = await evento.userChoice;
			if (outcome === 'accepted') evento = null;
		} else if (ios) {
			avisar('Tocá Compartir y después “Agregar a inicio”.', 'info', { titulo: 'Instalá SOMA en tu iPhone', duracion: 9000 });
		}
	}
</script>

{#if !instalada && (evento || ios)}
	<button class="instalar" class:compacto onclick={instalar} title="Instalar SOMA como app">
		<Icon name={ios && !evento ? 'share' : 'download'} size={compacto ? 17 : 16} />
		{#if !compacto}Instalar app{/if}
	</button>
{/if}

<style>
	.instalar {
		display: inline-flex; align-items: center; gap: 8px; justify-content: center;
		height: 38px; padding: 0 14px; border-radius: 12px; font-size: 14px; font-weight: 600;
		background: var(--brand-soft); color: var(--brand); border: 1px solid #bfe7df;
	}
	.instalar:hover { background: #d8f1ec; }
	.instalar.compacto { width: 36px; height: 36px; padding: 0; border-radius: 50%; }
</style>
