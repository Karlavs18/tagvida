import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>Tag Vida — Siempre cerca de quien amas</title>
      </Head>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F9F7F4',
        fontFamily: 'Nunito, sans-serif', textAlign: 'center', padding: '2rem'
      }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: '#1A1A2E', marginBottom: '.5rem' }}>
            Tag <span style={{ color: '#FF6B35' }}>V</span>ida
          </h1>
          <p style={{ color: '#6B7280', fontWeight: 600 }}>Siempre cerca de quien amas</p>
        </div>
      </div>
    </>
  )
}
