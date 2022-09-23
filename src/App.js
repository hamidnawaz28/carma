import "./App.css";
import Routes from "./routes";
import { Header, Grid, Footer, App as AppLayout } from "./components/layouts";
function App() {
  return (
    <AppLayout>
      <Header />
      <Grid>
        <Routes />
      </Grid>
      <Footer />
    </AppLayout>
  );
}

export default App;
