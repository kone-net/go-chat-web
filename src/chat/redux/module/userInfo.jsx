const initialState = {
    user: {}
}

export const types = {
    USER_SET: 'USER/SET',
}

export const actions = {
    setUser: (user) => ({
        type: types.USER_SET,
        user: user
    }),
}

const userInfoReducer = (state = initialState, action) => {
    switch (action.type) {
        case types.USER_SET:
            return { ...state, user: action.user }
        default:
            return state
    }
}

export default userInfoReducer
