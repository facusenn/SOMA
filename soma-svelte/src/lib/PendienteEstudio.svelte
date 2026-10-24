<script>
	import Icon from '$lib/Icon.svelte';
	import { ui } from '$lib/estado.svelte.js';
</script>

{#if ui.pendienteEstudio}
	<div class="aviso card">
		<span class="ico"><Icon name="flask" /></span>
		<div class="txt">
			<strong>¿Subís el archivo del estudio?</strong>
			<span class="muted">PDF o foto. SOMA lee los valores y los ordena.</span>
		</div>
		<button class="btn primary" onclick={() => ui.elegirArchivo?.()} disabled={ui.subiendo}>
			{#if ui.subiendo}<span class="spin"><Icon name="refresh" size={16} /></span> Leyendo…{:else}<Icon name="upload" size={16} /> Subir{/if}
		</button>
		<button class="cerrar" onclick={() => (ui.pendienteEstudio = null)} aria-label="Ahora no"><Icon name="x" size={16} /></button>
	</div>
{/if}

<style>
	.aviso { display: flex; align-items: center; gap: 12px; padding: 12px 14px; animation: rise 0.2s ease-out; text-align: left; }
	.ico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--estudio-bg); color: var(--estudio); flex: none; }
	.txt { flex: 1; display: grid; font-size: 14px; }
	.txt span { font-size: 13px; }
	.cerrar { color: var(--muted); padding: 6px; }
	@media (max-width: 520px) { .txt span { display: none; } }
</style>
