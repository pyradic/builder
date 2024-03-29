import { config } from 'dotenv';

const dotenv = config({
    // debug   : false,
    encoding: 'utf8'
})

export type PyroDotEnvPartial = typeof process.env & {
    [ key: string ]: any
    APP_ENV?: any
    APP_KEY?: any
    APP_DEBUG?: any
    APP_NAME?: any
    APP_LOCALE?: any
    APP_FALLBACK_LOCALE?: any
    APP_TIMEZONE?: any
    DEBUG_BAR?: any
    DB_CONNECTION?: any
    DB_HOST?: any
    DB_DATABASE?: any
    DB_USERNAME?: any
    DB_PASSWORD?: any
    DEFAULT_LOCALE?: any
    LOCALE?: any
    FALLBACK_LOCALE?: any
    ENABLED_LOCALES?: any
    UNIT_SYSTEM?: any
    DATE_FORMAT?: any
    TIME_FORMAT?: any
    APPLICATION_NAME?: any
    APPLICATION_REFERENCE?: any
    APPLICATION_DOMAIN?: any
    DOMAIN_PREFIX?: any
    RESULTS_PER_PAGE?: any
    ADMIN_USERNAME?: any
    ADMIN_EMAIL?: any
    ADMIN_PASSWORD?: any
    ADMIN_THEME?: any
    DUMMY_TEST?: any
    INSTALLED?: any
    MAINTENANCE_MODE?: any
    MAINTENANCE_AUTH?: any
    IP_WHITELIST?: any
    FROM_ADDRESS?: any
    FROM_NAME?: any
    MAIL_DRIVER?: any
    MAIL_HOST?: any
    MAIL_PORT?: any
    MAIL_USERNAME?: any
    MAIL_PASSWORD?: any
    HTTP_CACHE?: any
    DB_CACHE?: any
    LOCKING_ENABLED?: any
    WEBPACK_ENABLED?: any
    WEBPACK_NAMESPACE?: any
    WEBPACK_PATH?: any
    WEBPACK_PROTOCOL?: any
    WEBPACK_HOST?: any
    WEBPACK_PORT?: any
}

export const env:PyroDotEnvPartial = dotenv.parsed as {}

