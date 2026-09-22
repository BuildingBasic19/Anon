import Head from 'next/head';
import '../styles/globals.css';
import AppHeader from '../components/AppHeader';
import Navbar from '../components/Navbar';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>HBTU Anon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <AppHeader />
      <Navbar />
      <div className="container">
        <Component {...pageProps} />
      </div>
    </>
  );
}
