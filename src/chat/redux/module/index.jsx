import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import userInfoReducer from './userInfo'

const reducer = combineReducers({
    userInfoReducer
});

export default createStore(reducer, applyMiddleware(thunk));