import { useState } from 'react';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import StockAnalysis from './pages/StockAnalysis';
import Portfolio from './pages/Portfolio';
import Surveillance from './pages/Surveillance';

function App() {
  const [currentPage, setCurrentPage] = useState('overview');

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview />;
      case 'analysis':
        return <StockAnalysis />;
      case 'portfolio':
        return <Portfolio />;
      case 'surveillance':
        return <Surveillance />;
      default:
        return <Overview />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
