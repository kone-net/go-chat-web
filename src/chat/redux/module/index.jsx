import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import userInfoReducer from './userInfo'
import panelReducer from './panel'

const reducer = combineReducers({
    userInfoReducer,
    panelReducer
});

export default createStore(reducer, applyMiddleware(thunk));