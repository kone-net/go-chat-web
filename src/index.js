import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Login from './chat/Login';
import Panel from './chat/Panel';
import { Switch, Route, BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './chat/redux/module/index';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
    <BrowserRouter>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/panel/:user" component={Panel} />
        <Route path="/" component={Login} />
      </Switch>
    </BrowserRouter>
  </Provider>,
  </React.StrictMode>
);
