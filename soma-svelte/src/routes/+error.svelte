<script>
	import { page } from '$app/state';
	import Icon from '$lib/Icon.svelte';
</script>

<svelte:head><title>SOMA · {page.status === 404 ? 'No encontrado' : 'Error'}</title></svelte:head>

<div class="error">
	<span class="ico"><Icon name={page.status === 404 ? 'info' : 'alert'} size={28} /></span>
	<p class="eyebrow">Error {page.status}</p>
	<h1>{page.status === 404 ? 'Esta página no existe' : 'Algo salió mal'}</h1>
	<p class="muted">
		{page.status === 404 ? 'Puede que el enlace esté mal escrito.' : (page.error?.message ?? 'Probá recargar la página en unos segundos.')}
	</p>
	<div class="acciones">
		<a class="btn primary" href="/"><Icon name="mic" size={16} /> Volver a registrar</a>
		<button class="btn" onclick={() => location.reload()}><Icon name="refresh" size={16} /> Recargar</button>
	</div>
</div>

<style>
	.error { min-height: 60dvh; display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; padding: 24px; }
	.ico { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); margin-bottom: 8px; }
	.acciones { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; justify-content: center; }
</style>
