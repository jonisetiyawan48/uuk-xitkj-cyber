// The portal never executes commands. The deliberately vulnerable exporter lives
// in an opt-in, disposable sidecar with no portal files or credentials mounted.
export async function exportReport(title) {
  if (process.env.UUK_ENABLE_RCE_LAB !== 'true') return null;
  const response = await fetch('http://rce-lab:9000/export', {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({title}), signal:AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Exporter failed');
  const { stdout, stderr, code, timedOut } = await response.json();
  return `Moklet RCE training export\nExit: ${code}\nTimed out: ${timedOut}\n\n${stdout}\n${stderr}`;
}
