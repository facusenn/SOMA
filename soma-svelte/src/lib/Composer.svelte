<script>
	import Icon from '$lib/Icon.svelte';
	import PendienteEstudio from '$lib/PendienteEstudio.svelte';
	import { ui } from '$lib/estado.svelte.js';
	import { Dictado, registrar, mmss, CANCELAR } from '$lib/dictado.svelte.js';

	const d = new Dictado();
	// Al salir de la pantalla se corta el micrófono, si no seguiría reabriéndose solo.
	$effect(() => () => d.cancelar());
	let texto = $state('');

	function enviar(e) {
		e.preventDefault();
		const t = texto.trim();
		if (!t) return;
		texto = '';
		registrar(t);
	}
</script>

<div class="dock">
	<PendienteEstudio />

	{#if ui.procesando}
		<div class="procesando card">
			<span class="spin"><Icon name="sparkles" size={16} /></span>
			<span class="t">“{ui.procesando}”</span>
			<span class="muted">Registrando…</span>
		</div>
	{/if}

	<form class="barra" class:rec={d.grabando} onsubmit={enviar}>
		<button type="button" class="redondo suave" title="Subir estudio" onclick={() => ui.elegirArchivo?.()} disabled={d.grabando || ui.subiendo}>
			<Icon name="clip" size={20} />
		</button>

		<div class="campo">
			{#if d.grabando}
				<div class="grabacion">
					<span class="punto"></span>
					<span class="tiempo">{mmss(d.segundos)}</span>
					<span class="dicho" class:vacio={!d.transcripcion}>{d.transcripcion || 'Te escucho…'}</span>
					<span class="cancelar" style="opacity:{1 + d.desplazamiento / CANCELAR}">
						<Icon name="left" size={14} /> Deslizá para cancelar
					</span>
				</div>
			{:else}
				<input bind:value={texto} placeholder="Contale a SOMA qué te pasó…" aria-label="Escribí lo que te pasó" enterkeyhint="send" />
			{/if}
		</div>

		{#if texto.trim()}
			<button type="submit" class="redondo principal" aria-label="Enviar"><Icon name="send" size={20} /></button>
		{:else}
			<button
				type="button"
				class="redondo principal mic"
				class:activo={d.grabando}
				style="transform: translateX({d.desplazamiento}px) scale({d.grabando ? 1.35 : 1})"
				aria-label="Mantené apretado para hablar"
				title="Mantené apretado para hablar"
				onpointerdown={d.presionar}
				onpointermove={d.mover}
				onpointerup={d.soltar}
				onpointercancel={d.soltar}
				oncontextmenu={(e) => e.preventDefault()}
			>
				<Icon name="mic" size={22} />
			</button>
		{/if}
	</form>
</div>

<style>
	.dock { display: grid; gap: 8px; }
	.barra {
		display: flex; align-items: center; gap: 10px;
		background: var(--surface); border: 1px solid var(--line); border-radius: 999px;
		padding: 6px; box-shadow: var(--shadow-lg);
	}
	.barra.rec { border-color: #fecdd3; }
	.campo { flex: 1; min-width: 0; height: 44px; display: flex; align-items: center; }
	input { width: 100%; border: 0; outline: 0; background: none; font-size: 15.5px; padding: 0 4px; }
	input::placeholder { color: #94a3b8; }
	.redondo { width: 44px; height: 44px; border-radius: 50%; flex: none; display: grid; place-items: center; transition: background 0.15s, transform 0.15s; }
	.suave { color: var(--muted); }
	.suave:hover { background: var(--surface-2); color: var(--ink); }
	.principal { background: linear-gradient(135deg, var(--brand-2), var(--brand)); color: white; box-shadow: 0 4px 14px rgba(15, 118, 110, 0.35); }
	.mic { touch-action: none; user-select: none; -webkit-user-select: none; }
	.mic.activo { background: linear-gradient(135deg, #f43f5e, #e11d48); animation: pulso 1.4s infinite; }
	@keyframes pulso { 0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.45); } 100% { box-shadow: 0 0 0 18px rgba(225, 29, 72, 0); } }
	.grabacion { display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; padding-left: 4px; }
	.punto { width: 10px; height: 10px; border-radius: 50%; background: #e11d48; animation: parpadeo 1s infinite; flex: none; }
	@keyframes parpadeo { 50% { opacity: 0.25; } }
	.tiempo { font-variant-numeric: tabular-nums; font-weight: 600; flex: none; }
	.dicho { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.dicho.vacio { color: var(--muted); }
	.cancelar { display: inline-flex; align-items: center; gap: 2px; color: var(--muted); font-size: 13px; flex: none; }
	.procesando { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; animation: rise 0.2s ease-out; color: var(--brand); }
	.procesando .t { flex: 1; min-width: 0; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: italic; }
	@media (max-width: 520px) { .cancelar { display: none; } }
</style>
