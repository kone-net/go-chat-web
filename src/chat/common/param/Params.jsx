export const API_VERSION = "/api/v1/";

const PROTOCOL = "http://"
export const IP_PORT = "localhost:8888";
//local
export const HOST = PROTOCOL + IP_PORT;

export const LOGIN_URL = HOST + '/user/login'
export const REGISTER_URL = HOST + '/user/register'
export const USER_URL = HOST + '/user/'
export const USER_NAME_URL = HOST + '/user/name'
export const USER_LIST_URL = HOST + '/user'

export const USER_FRIEND_URL = HOST + '/friend'

export const MESSAGE_URL = HOST + '/message'

export const GROUP_LIST_URL = HOST + '/group'
export const GROUP_USER_URL = HOST + '/group/user/'
export const GROUP_JOIN_URL = HOST + '/group/join/'

export const FILE_URL = HOST + '/file'




export const FINANCIAL_PARAM_URL = HOST + API_VERSION + 'financial-param/';
export const AUTH_HEADER_KEY = "Authorization";
export const TOKEN_PREFIX = "Bearer ";

