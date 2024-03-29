import { helpers, plugins, rules, Webpacker } from '@radic/webpacker';
import { join, resolve }                      from 'path';
import { JsonPlugin }                         from './JsonPlugin';
import { Builder, BuilderOptions }            from './Builder';
import { map2object }                         from './utils';
import EntrypointPathPlugin                   from './EntrypointPathPlugin';
import { CleanWebpackPlugin, Options }        from 'clean-webpack-plugin';


export function setupBase(options: BuilderOptions) {
    const { mode, namespace, rootPath, outputPath } = options;
    const wp                                        = new Webpacker({
        mode       : mode,
        path       : rootPath,
        contextPath: rootPath,
        sourceMap  : mode === 'development',
    });
    wp.settings.set('babel', {
        babelrc       : false,
        configFile    : false,
        cacheDirectory: false, //wp.isDev,
        compact       : wp.isProd,
        sourceMaps    : wp.isDev,
        comments      : wp.isDev,
        presets       : [ [ '@vue/babel-preset-app' ] ],
        plugins       : [
            [ 'import', { libraryName: 'lodash', libraryDirectory: '', camel2DashComponentName: false } ],
        ],
    });

    wp.module.rule('babel').test(/\.(js|mjs|jsx)$/).exclude.add(/node_modules/);
    wp.module.rule('typescript').test(/\.(ts|tsx)$/).exclude.add(/node_modules/);

    wp.resolveLoader.symlinks(true);
    wp.resolve.symlinks(true);


    wp.output
        .library([ namespace, '[addon:exportName]' ] as any)
        .libraryTarget('window')
        .filename('js/[name].js')
        .chunkFilename('js/[entrypoint].chunk.[name].js')
        .path(join(rootPath, outputPath))
        .publicPath('/assets')
        .pathinfo(wp.isDev)
    ;

    rules.css(wp);
    rules.scss(wp, {
        scss: {
            implementation: require('sass'),
        },
    });
    rules.stylus(wp);
    rules.images(wp);
    rules.fonts(wp, { publicPath: '/assets/fonts/' });
    rules.vue(wp);
    plugins.vueLoader(wp);

    rules.pug(wp);

    rules.babel(wp);
    // rules.cache(wp, {}, 'typescript')
    // rules.thread(wp, {}, 'typescript')
    // wp.module.rule('typescript').use('save-content-loader').loader(resolve(rootPath, 'save-content-loader')).options({ name: 'babel' });
    rules.babel(wp, {}, 'typescript');
    // wp.module.rule('typescript').use('save-content-loader').loader(resolve(rootPath, 'save-content-loader')).options({    name: 'typescript',});
    rules.typescript(wp, {
        appendTsxSuffixTo: [ /.vue$/ ],
        configFile       : 'tsconfig.json',
        transpileOnly    : true,
        // experimentalWatchApi: true,
        // happyPackMode       : true,
        compilerOptions  : {
            target        : 'es5' as any,
            module        : 'esnext' as any,
            importHelpers : true,
            sourceMap     : wp.isDev,
            removeComments: wp.isProd,
        },
    });

    wp.blocks.rules.typescriptImport(wp, [
        wp.blocks.rules.typescriptImportPresets.lodash,
    ]);

    wp.resolve.modules.merge([ resolve(rootPath, 'node_modules') ]);
    wp.resolve.alias.merge({
        'jquery$'    : 'jquery/src/jquery',
        // 'vue$'                               : 'vue/dist/vue.esm.js',
        'babel-core$': '@babel/core',
        // 'streams::'                          : resolve(rootPath, 'vendor/anomaly/streams-platform/resources'),
    });

    wp.externals({
        'jquery'                : 'jQuery',
        'vue'                   : 'Vue',
        'vue-class-component'   : 'VueClassComponent',
        'vue-property-decorator': 'vue-property-decorator',
        'bootstrap'             : 'jQuery',
    });

    plugins.define(wp, {
        DEV          : wp.isDev,
        PROD         : wp.isProd,
        HOT          : wp.isHot,
        ENV          : process.env.NODE_ENV,
        NAMESPACE    : namespace,
        'process.env': {
            NODE_ENV: `"#{process.env.NODE_ENV}"`,
        },
    } as any);

    wp.plugin('clean').use(CleanWebpackPlugin, [ <Options>{
        cleanOnceBeforeBuildPatterns: [ wp.output.store.get('path') ],
        verbose                     : true,
    } ]);

    wp.optimization
        .merge({
            chunkIds : 'named',
            moduleIds: 'named',
        })
        .namedChunks(true)
        .namedModules(true);

    if ( wp.isProd ) {
        wp.settings.sourceMap = false;
        wp.devtool(false);
        wp.mode('production');
        wp.optimization.minimize(true);

        helpers.minimizer(wp, {
            terserOptions: {
                keep_classnames: /.*ServiceProvider.*/,
                keep_fnames    : /.*ServiceProvider.*/,
            },
        });
        /* replace style-loader with MiniCssExtract.loader */
        helpers.replaceStyleLoader(wp, 'css');
        helpers.replaceStyleLoader(wp, 'scss');
        plugins.loaderOptions(wp, {
            minimize: true,
        });
        // helpers.minimizer(wp)
    }

    plugins.miniCssExtract(wp, {
        filename     : 'css/[name].css',
        chunkFilename: 'css/[name].chunk.[id].css',
    });

    return wp;
}

export function setupWebpacker(builder: Builder) {
    const { env, options, addons } = builder;
    const wp                       = setupBase(options as any);
    wp.stats(false);
    /* Report file sizes after compilation */
    plugins.size(wp);
    plugins.friendlyErrors(wp);
    /* Show progress bar */
    plugins.bar(wp);
    /* Generates a detailed compilation report */
    plugins.bundleAnalyzer(wp, {
        reportFilename: resolve(options.rootPath, options.outputPath, 'bundle-analyzer.html'),
    });
    plugins.html(wp, {
        template: resolve(__dirname, '../index.html'),
        filename: 'index.html',
    });

    /* Provides the '[addon:<name>]' tag in output configuration */
    plugins.extraTemplatedPaths(wp, {
        templates: {
            addon: (c, p) => {
                let addon = addons.find(a => a.exportName === c.chunkName);
                if ( !addon ) {
                    return false;
                }
                if ( !p.hasArg ) {
                    return addon.path;
                }
                if ( typeof addon[ p.arg ] === 'string' ) {
                    return addon[ p.arg ];
                }
                return false;
            },
        },
    });

    /* Provides the '[entrypoint]' tag in output configuration */
    wp.plugin('entrypoint-path').use(EntrypointPathPlugin);


    /* expose assigns a library to global/window */
    rules.expose(wp, 'inversify');
    rules.expose(wp, 'tapable');
    rules.expose(wp, { name: `lodash`, as: '_' });
    // rules.expose(wp, { name: 'vue', as: 'Vue' })
    rules.expose(wp, { name: 'reflect-metadata', as: 'reflect_metadata' });

    /* JsonPlugin creates the webpack.json file */
    JsonPlugin.webpackJson.filePath = resolve(options.rootPath, options.manifestPath);
    JsonPlugin.webpackJson.ensureRemoved();
    wp.plugin('json').use(JsonPlugin, [ <JsonPlugin.Options>{
        filePath   : resolve(options.rootPath, options.manifestPath),
        data       : {
            server   : wp.isServer,
            mode     : wp.store.get('mode'),
            output   : {},
            devServer: {},
        },
        transformer: (jsonData, _data) => {
            addons.reloadJSONData();
            let data       = _data.getData();
            let entryNames = Object.keys(data);
            entryNames.forEach(entryName => {
                let addon     = addons.findByExportNames(entryName);
                let entryData = data[ entryName ];
                if ( addon ) {
                    addon.addEntry(entryName, entryData);
                    // addon.scripts.push(...entryData.scripts)
                    // addon.styles.push(...entryData.styles)
                }
            });
            jsonData.output      = map2object(wp.output.store);
            jsonData.output.path = jsonData.output.path.replace(options.rootPath + '/', '');
            jsonData.devServer   = wp.isServer ? map2object(wp.devServer.store) : null;
            jsonData.addons      = addons.sortByDependency().map((addon, index) => {
                addon.sorted = index;
                const obj    = addon.toObject();
                obj.srcPath  = obj.srcPath.replace(options.rootPath + '/', '');
                for ( const key of Object.keys(obj.entries) ) {
                    obj.entries[ key ].path = obj.entries[ key ].path.replace(options.rootPath + '/', '');
                }
                return obj;
            });
            return jsonData;
        },
        done       : (jsonData, _data, stats) => {

            let data       = _data.getData();
            let entryNames = Object.keys(data);
        },
    } ]);

    //
    // wp.extendConfig(config => {
    //     let o          = config.optimization;
    //     o.chunkIds     = 'named';
    //     o.moduleIds    = 'named';
    //     o.namedChunks  = true;
    //     o.namedModules = true;
    // });

    if ( wp.isDev ) {
        wp.devtool('#source-map');
        wp.output
            .devtoolModuleFilenameTemplate(info => {
                var $filename = 'sources://' + info.resourcePath;
                $filename     = 'webpack:///' + info.resourcePath; // +'?' + info.hash;
                if ( info.resourcePath.match(/\.vue$/) && !info.allLoaders.match(/type=script/) && !info.query.match(/type=script/) ) {
                    $filename = 'webpack-generated:///' + info.resourcePath; // + '?' + info.hash;
                }
                return $filename;
            })
            .devtoolFallbackModuleFilenameTemplate('webpack:///[resource-path]?[hash]');
    }

    if ( wp.isProd ) {
        /* Move all common vendor libraries into 1 vendor chunk */
        wp.optimization
            .splitChunks({
                cacheGroups: {
                    vendors: {
                        name   : 'vendors',
                        test   : /[\\/]node_modules[\\/](inversify|reflect-metadata|core-js|axios|tapable|util|lodash|element-ui|tslib|process|debug|regenerator-runtime|@babel\/runtime)/,
                        enforce: true,
                        chunks : 'initial',
                    },
                },
            });
    }
    if ( wp.isServer ) {
        /* Setup webpack-dev-server */
        wp.module.rules.delete('source-map-loader');
        wp.stats(false);
        helpers.devServer(wp);
        helpers.setServerLocation(
            wp,
            options.protocol || 'http',
            options.host || 'localhost',
            options.port || 8179,
        );

        wp.devServer
            .contentBase(join(options.rootPath, options.outputPath))
            .overlay(true)
            .inline(true);

        wp.devServer.set('writeToDisk', true);
        wp.optimization.minimize(false);
    }

    /* Handle addons: Adds all addon entrypoints, Adds references to externals */
    for ( const addon of addons ) {
        let main = addon.entrypoints.env(wp.store.get('mode')).main();
        wp.entry(addon.exportName).add(main.path);
        wp.externals({
            ...wp.get('externals'),
            [ addon.name ]: [ options.namespace, addon.exportName ],
        });

        addon.entrypoints.env(wp.store.get('mode')).suffixed().forEach(entrypoint => {
            wp.entry(addon.exportName + entrypoint.suffix).add(entrypoint.path);
            wp.externals({
                ...wp.get('externals'),
                [ addon.name + entrypoint.suffix ]: [ options.namespace, addon.exportName + entrypoint.suffix ],
            });
        });

        // if ( addon.isSingle ) {
        //     wp.entry(addon.entryName).add(addon.entry.development);
        // } else {
        //     for ( const entry of addon.entrypoints ) {
        //         if ( 'env' in entry === false || entry.env === wp.store.get('mode') ) {
        //             wp.entry(addon.entryName + (entry.suffix || '')).add(entry.path)
        //         }
        //     }
        // }

    }


    return wp;
}
