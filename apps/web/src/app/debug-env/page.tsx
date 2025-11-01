export default function DebugEnv() {
  const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL;
  const useRailway = process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND;
  const hasApiKey = !!process.env.NEXT_PUBLIC_RAILWAY_API_KEY;

  const expectedUrl = 'https://gayed-backend-production.up.railway.app';
  const isCorrect = railwayUrl === expectedUrl;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: isCorrect ? 'green' : 'red' }}>
        {isCorrect ? '✅ Environment Variables Correct' : '❌ Environment Variables Issue Detected'}
      </h1>

      <h2>Environment Variables</h2>
      <table border={1} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Variable</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Value</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Length</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: isCorrect ? '#e8f5e9' : '#ffebee' }}>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>NEXT_PUBLIC_RAILWAY_BACKEND_URL</td>
            <td style={{ padding: '10px', wordBreak: 'break-all', fontSize: '12px' }}>
              {railwayUrl || 'NOT SET'}
            </td>
            <td style={{ padding: '10px' }}>
              {railwayUrl?.length || 0} / 52 chars
            </td>
            <td style={{ padding: '10px' }}>
              {isCorrect ? '✅ Correct' : '❌ Incorrect'}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>NEXT_PUBLIC_USE_RAILWAY_BACKEND</td>
            <td style={{ padding: '10px' }}>
              {useRailway || 'NOT SET'}
            </td>
            <td style={{ padding: '10px' }}>
              {useRailway?.length || 0} chars
            </td>
            <td style={{ padding: '10px' }}>
              {useRailway === 'true' ? '✅ Enabled' : '⚠️ Disabled'}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '10px', fontWeight: 'bold' }}>NEXT_PUBLIC_RAILWAY_API_KEY</td>
            <td style={{ padding: '10px' }}>
              {hasApiKey ? '***SET*** (hidden for security)' : 'NOT SET'}
            </td>
            <td style={{ padding: '10px' }}>
              {process.env.NEXT_PUBLIC_RAILWAY_API_KEY?.length || 0} chars
            </td>
            <td style={{ padding: '10px' }}>
              {hasApiKey ? '✅ Set' : '❌ Missing'}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Expected Values</h2>
      <ul style={{ lineHeight: '1.8' }}>
        <li>
          <strong>NEXT_PUBLIC_RAILWAY_BACKEND_URL:</strong>{' '}
          <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px' }}>
            https://gayed-backend-production.up.railway.app
          </code>{' '}
          (52 characters)
        </li>
        <li>
          <strong>NEXT_PUBLIC_USE_RAILWAY_BACKEND:</strong>{' '}
          <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px' }}>true</code> (4 characters)
        </li>
        <li>
          <strong>NEXT_PUBLIC_RAILWAY_API_KEY:</strong>{' '}
          <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px' }}>28 characters</code>
        </li>
      </ul>

      {!isCorrect && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          padding: '20px',
          marginTop: '20px',
          borderRadius: '4px'
        }}>
          <h2 style={{ marginTop: 0, color: '#856404' }}>⚠️ Issue Detected</h2>

          {!railwayUrl && (
            <p><strong>Problem:</strong> NEXT_PUBLIC_RAILWAY_BACKEND_URL is not set at all.</p>
          )}

          {railwayUrl && railwayUrl !== expectedUrl && (
            <>
              <p><strong>Problem:</strong> Railway URL is incorrect or truncated.</p>
              <p><strong>Current:</strong> <code>{railwayUrl}</code> ({railwayUrl.length} chars)</p>
              <p><strong>Expected:</strong> <code>{expectedUrl}</code> (52 chars)</p>
              <p><strong>Missing:</strong> {expectedUrl.substring(railwayUrl.length)}</p>
            </>
          )}

          <h3>How to Fix:</h3>
          <ol>
            <li>Go to <strong>Vercel Dashboard → Settings → Environment Variables</strong></li>
            <li>Delete the existing <code>NEXT_PUBLIC_RAILWAY_BACKEND_URL</code> variable</li>
            <li>Add it again with the full URL: <code>https://gayed-backend-production.up.railway.app</code></li>
            <li>Select <strong>Production, Preview, and Development</strong> environments</li>
            <li>Save and <strong>Redeploy</strong> (uncheck "Use existing Build Cache")</li>
          </ol>
        </div>
      )}

      {isCorrect && (
        <div style={{
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          padding: '20px',
          marginTop: '20px',
          borderRadius: '4px'
        }}>
          <h2 style={{ marginTop: 0, color: '#155724' }}>✅ Configuration Looks Good!</h2>
          <p>All environment variables are set correctly. The Railway backend should be working.</p>
          <p>If you're still experiencing issues, check:</p>
          <ul>
            <li>Railway backend is running (visit health check)</li>
            <li>API key is valid</li>
            <li>Browser console for error messages</li>
          </ul>
        </div>
      )}

      <h2>Quick Actions</h2>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={() => {
            fetch('/api/signals?fast=true')
              .then(r => r.json())
              .then(data => alert(`Local API: ${data.signals?.length || 0} signals`))
              .catch(err => alert(`Error: ${err.message}`));
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Test Local API
        </button>

        <button
          onClick={() => {
            if (railwayUrl) {
              window.open(`${railwayUrl}/api/health`, '_blank');
            } else {
              alert('Railway URL not configured');
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Check Railway Health
        </button>
      </div>

      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <h3>Troubleshooting Guide</h3>
        <p>See <code>URGENT_FIX.md</code> in the project root for detailed instructions.</p>
      </div>
    </div>
  );
}
