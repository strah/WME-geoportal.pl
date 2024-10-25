// ==UserScript==
// @name            geoportal.gov.pl layers for WME (API Jan 2020)
// @version         0.2.15.20
// @description     Adds geoportal.gov.pl overlays ("satelite view", cities, places, house numbers)
// @grant           none
// @include         https://*.waze.com/*/editor*
// @include         https://*.waze.com/editor*
// @include         https://*.waze.com/map-editor*
// @include         https://*.waze.com/beta_editor*
// @include         https://editor-beta.waze.com*
// @copyright       2013-2018+, Patryk Ściborek, Paweł Pyrczak
// @run-at          document-end
// @namespace https://greasyfork.org/users/9996
// @downloadURL https://update.greasyfork.org/scripts/395614/geoportalgovpl%20layers%20for%20WME%20%28API%20Jan%202020%29.user.js
// @updateURL https://update.greasyfork.org/scripts/395614/geoportalgovpl%20layers%20for%20WME%20%28API%20Jan%202020%29.meta.js
// ==/UserScript==

/**
 * Source code: https://github.com/TKr/WME-geoportal - deprecated
 * Source code: https://github.com/strah/WME-geoportal.pl
 */


/* Changelog:
 *
 *  0.2.15.20 - css tweaks - moving toggles to the "view" section
 *  0.2.15.19 - css tweaks
 *  0.2.15.18 - accommodating WME updates (by @luc45z)
 *  0.2.15.17 - accommodating WME updates (by @luc45z)
 *  0.2.15.16 - Fix for CSP errors
 *  0.2.15.15 - Added streets overlay (by absf11_2)
 *  0.2.15.14 - Added hi-res ortophoto map (by absf11_2)
 *  0.2.15.13 - API endpoint change (street numbers)
 *  0.2.15.12 - z-index fix
 *  0.2.15.11 - added administrative map overlay
 *  0.2.15.10 - updated ortofoto map API URL
 *  0.2.15.9 - added mileage bars overlay
 *  0.2.15.8 - added railcrossings overlay
 *  0.2.15.7 - fixed for the new layers swither, again
 *  0.2.15.6 - fixed for the new layers swither
 *  0.2.15.5 - added new layer: "miejsca", simplified layers names
 *  0.2.15.4 - updated BDOT url (again)
 *  0.2.15.3 - updated BDOT url
 *  0.2.15.2 - fixed for the new layers switcher
 *  0.2.15.1 - fixed window.Waze/window.W deprecation warnings
 *  0.2.15.0 - fixed layers zIndex switching
 *  0.2.14.1 - fixed include addresses
 *  0.2.14.0 - fixed adding toggle on layer list (new WME version)
 */
(function () {
    
    function geoportal_run() {
        GEOPORTAL = { ver: "0.2.15.19" };
        GEOPORTAL.init = function(w)
        {
            console.log('Geoportal: Version ' + this.ver + ' init start');

            const style = document.createElement('style');
            style.innerHTML = `
                .layer-switcher ul[class^="collapsible"]  {
                    max-height: none;
                }
            `;
            document.head.appendChild(style);

            wms_service_orto="https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution?"; // layer: Raster
            wms_service_orto_high="https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?"; // layer: Raster
            wms_service_orto_2="http://sdi.geoportal.gov.pl/wms_orto/wmservice.aspx?"; // layer: ORTOFOTO,ORTOFOTO_ISOK
            wms_service_prng="http://mapy.geoportal.gov.pl/wss/service/pub/guest/G2_PRNG_WMS/MapServer/WMSServer?dpi=130&"; // nazwy
            wms_service_bud="http://mapy.geoportal.gov.pl/wss/service/pub/guest/G2_BDOT_BUD_2010/MapServer/WMSServer?"; // budynki
            wms_bdot = "https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaNumeracjiAdresowej?request=GetMap&";
            wms_rail = "https://mapy.geoportal.gov.pl/wss/service/sdi/Przejazdy/get?REQUEST=GetMap&";
            wms_mileage = "https://mapy.geoportal.gov.pl/wss/ext/OSM/SiecDrogowaOSM?REQUEST=GetMap&";
            wms_parcels="https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?"; // ewidencja
            var my_wazeMap = w;
            if (typeof my_wazeMap == undefined) my_wazeMap = window.W.map;

            var epsg900913 = new window.OpenLayers.Projection("EPSG:900913");
            var epsg4326 =  new window.OpenLayers.Projection("EPSG:4326");
            var tileSizeG = new window.OpenLayers.Size(512,512);

            ConvTo2180 = function(p) {
                var D2R = 0.01745329251994329577;
                var mlfn = function(e0, e1, e2, e3, phi) {
                    return (e0 * phi - e1 * Math.sin(2 * phi) + e2 * Math.sin(4 * phi) - e3 * Math.sin(6 * phi));
                }
                var contants = {
                    a: 6378137.0,
                    rf: 298.257222101,
                    x0 : 500000,
                    y0 : -5300000,
                    k0 : 0.9993,
                    init : function() {
                        var D2R = 0.01745329251994329577;
                        this.lon0 = 19.0 * D2R;
                        this.lat0 = 0 * D2R;
                        this.b = ((1.0 - 1.0 / this.rf) * this.a);
                        this.ep2 = ((Math.pow(this.a,2) - Math.pow(this.b,2)) / Math.pow(this.b,2));
                        this.es = ((Math.pow(this.a,2) - Math.pow(this.b,2)) / Math.pow(this.a,2));
                        this.e0 =  (1 - 0.25 * this.es * (1 + this.es / 16 * (3 + 1.25 * this.es)));
                        this.e1 = (0.375 * this.es * (1 + 0.25 * this.es * (1 + 0.46875 * this.es)));
                        this.e2 = (0.05859375 * this.es * this.es * (1 + 0.75 * this.es));
                        this.e3 = (this.es * this.es * this.es * (35 / 3072));
                        this.ml0 = this.a * mlfn(this.e0, this.e1, this.e2, this.e3, this.lat0);
                    }
                };
                contants.init();
                var lon = p.lon * D2R;
                var lat = p.lat * D2R;
                var a0 = 0;
                var b0 = 0;
                var k0 = 0.9993;
                var lon0 = 19.0 * D2R;
                var lat0 = 0 * D2R;
                var delta_lon = lon - lon0;
                var slon = (delta_lon < 0) ? -1 : 1;
                var delta_lon = (Math.abs(delta_lon) < Math.PI) ? delta_lon : (delta_lon - (slon * (Math.PI * 2)));
                var con;
                var x, y;
                var sin_phi = Math.sin(lat);
                var cos_phi = Math.cos(lat);
                var sphere = false;
                if (sphere) {
                    var b = cos_phi * Math.sin(delta_lon);
                    if ((Math.abs(Math.abs(b) - 1)) < 0.0000000001) {
                        return (93);
                    } else {
                        x = 0.5 * a0 * k0 * Math.log((1 + b) / (1 - b));
                        con = Math.acos(cos_phi * Math.cos(delta_lon) / Math.sqrt(1 - b * b));
                        if (lat < 0) {
                            con = -con;
                        }
                        y = a0 * k0 * (con - lat0);
                    }
                } else {
                    var al = cos_phi * delta_lon;
                    var als = Math.pow(al, 2);
                    var c = contants.ep2 * Math.pow(cos_phi, 2);
                    var tq = Math.tan(lat);
                    var t = Math.pow(tq, 2);
                    con = 1 - contants.es * Math.pow(sin_phi, 2);
                    var n = contants.a / Math.sqrt(con);
                    var ml = contants.a * mlfn(contants.e0, contants.e1, contants.e2, contants.e3, lat);
                    x = contants.k0 * n * al * (1 + als / 6 * (1 - t + c + als / 20 * (5 - 18 * t + Math.pow(t, 2) + 72 * c - 58 * contants.ep2))) + contants.x0;
                    y = contants.k0 * (ml - contants.ml0 + n * tq * (als * (0.5 + als / 24 * (5 - t + 9 * c + 4 * Math.pow(c, 2) + als / 30 * (61 - 58 * t + Math.pow(t, 2) + 600 * c - 330 * contants.ep2))))) + contants.y0;
                }
                p.lon = x;
                p.lat = y;
                return p;
            };

            getUrl4326 = function (bounds) {
                /* this function is modified Openlayer WMS CLASS part */
                /* Copyright (c) 2006-2013 by OpenLayers Contributors (see authors.txt for
                * full list of contributors). Published under the 2-clause BSD license.
                * See license.txt in the OpenLayers distribution or repository for the
                * full text of the license. */
                bounds = bounds.clone(); // Zrobione dlatego że tranformacja była dziedziczona do parenta i się sypało aż niemiło
                bounds = this.adjustBounds(bounds);

                var imageSize = this.getImageSize(bounds);
                var newParams = {};
                bounds.transform(this.epsg900913,this.epsg4326);
                if (this.ep2180) {
                    bounds = bounds.clone();
                    a={lat: bounds.bottom , lon: bounds.right}
                    b={lat: bounds.top, lon: bounds.left}
                    a=this.ConvTo2180(a);
                    b=this.ConvTo2180(b);

                    //swapped order in BBOX params - not sure where the error was: here or in the API
                    bounds.bottom = b.lon;
                    bounds.right = b.lat;
                    bounds.top = a.lon;
                    bounds.left = a.lat;
                }
                // WMS 1.3 introduced axis order
                var reverseAxisOrder = this.reverseAxisOrder();
                newParams.BBOX = this.encodeBBOX ?
                    bounds.toBBOX(null, reverseAxisOrder) :
                    bounds.toArray(reverseAxisOrder);
                newParams.WIDTH = imageSize.w;
                newParams.HEIGHT = imageSize.h;
                var requestString = this.getFullRequestString(newParams);
                return requestString;
            };

            getFullRequestString4326 = function(newParams, altUrl) {
                /* this function is modified Openlayer WMS CLASS part */
                /* Copyright (c) 2006-2013 by OpenLayers Contributors (see authors.txt for
                * full list of contributors). Published under the 2-clause BSD license.
                * See license.txt in the OpenLayers distribution or repository for the
                * full text of the license. */
                var mapProjection = this.map.getProjectionObject();
                var projectionCode = this.projection.getCode();
                var value = (projectionCode == "none") ? null : projectionCode;
                if (parseFloat(this.params.VERSION) >= 1.3) {
                    this.params.CRS = "EPSG:2180"; //value;
                } else {
                    if (this.ep2180) {
                        this.params.SRS = "EPSG:2180"; //na sztywno najlepiej
                    } else {
                        this.params.SRS = "EPSG:4326"; //na sztywno najlepiej
                    }
                }

                if (typeof this.params.TRANSPARENT == "boolean") {
                    newParams.TRANSPARENT = this.params.TRANSPARENT ? "TRUE" : "FALSE";
                }

                return window.OpenLayers.Layer.Grid.prototype.getFullRequestString.apply(this, arguments);
            }

            geoportalAddLayer = function(layer) {
                // Add layer entry in the new layer drawer
                var displayGroupSelector = document.querySelector('#layer-switcher-region .menu .list-unstyled');
                if (displayGroupSelector != null) {
                    var displayGroup = displayGroupSelector.querySelector('li.group:nth-child(5) ul');
                    var toggler = document.createElement('wz-checkbox');
                    var togglerContainer = document.createElement('li');
                    togglerContainer.className = 'hydrated';
                    togglerContainer.id = 'layer-switcher-geop_' + Math.random().toString(36).substring(7);
                    toggler.appendChild(document.createTextNode(layer.name));
                    toggler.addEventListener('click', function(e) {
                    layer.setVisibility(e.target.checked);
                    });
                    toggler.appendChild(togglerContainer);
                    displayGroup.appendChild(toggler);
                }
            }

            var geop_orto = new window.OpenLayers.Layer.WMS(
                "Geoportal - ortofoto",
                wms_service_orto,
                {
                    layers: "Raster",
                    format: "image/jpeg"
                },
                {
                    tileSize: tileSizeG,
                    isBaseLayer: false,
                    visibility: false,
                    transitionEffect: "resize",
                    uniqueName: "orto1",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: false,
                    getFullRequestString: getFullRequestString4326
                }
            );
            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["orto1"] = "Geoportal - ortofoto";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["orto1"] = "Geoportal - ortofoto";
            }

            var geop_orto_high = new window.OpenLayers.Layer.WMS(
                "Geoportal - ortofoto high res",
                wms_service_orto_high,
                {
                    layers: "Raster",
                    format: "image/jpeg"
                },
                {
                    tileSize: tileSizeG,
                    isBaseLayer: false,
                    visibility: false,
                    transitionEffect: "resize",
                    uniqueName: "ortoHigh",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: false,
                    getFullRequestString: getFullRequestString4326
                }
            );
            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["ortoHigh"] = "Geoportal - ortofoto high res";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["ortoHigh"] = "Geoportal - ortofoto high res";
            }

            //geoportal_prng
            var geop_prng = new OpenLayers.Layer.WMS(
                "Geoportal - nazwy",
                wms_service_prng,
                {
                    layers: "Wies,Miasto",
                    transparent: "true",
                    format: "image/png"
                },
                {
                    tileSize: tileSizeG,
                    isBaseLayer: false,
                    visibility: false,
                    uniqueName: "nazwy",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: false,
                    getFullRequestString: getFullRequestString4326
                }
            );
            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["nazwy"] = "Geoportal - nazwy";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["nazwy"] = "Geoportal - nazwy";
            }

            var geop_adresy2 = new OpenLayers.Layer.WMS(
                "Geoportal - adresy",
                wms_bdot,
                {
                    layers: "prg-adresy",
                    transparent: "true",
                    format: "image/png",
                    version: "1.3.0",
                },
                {
                    tileSize: tileSizeG,
                    isBaseLayer: false,
                    visibility: false,
                    uniqueName: "adresy2",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: true,
                    getFullRequestString: getFullRequestString4326
                }
            );

            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["adresy2"] = "Geoportal - adresy";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["adresy2"] = "Geoportal - adresy";
            }

            var geop_miejsca = new OpenLayers.Layer.WMS(
                "Geoportal - miejsca",
                wms_bdot,
                {
                    layers: "prg-place",
                    transparent: "true",
                    format: "image/png",
                    version: "1.3.0",
                },
                {
                    tileSize: tileSizeG,
                    isBaseLayer: false,
                    visibility: false,
                    uniqueName: "miejsca",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: true,
                    getFullRequestString: getFullRequestString4326
                }
            );

            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["miejsca"] = "Geoportal - miejsca";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["miejsca"] = "Geoportal - miejsca";
            }

            var geop_ulice= new OpenLayers.Layer.WMS(
                "Geoportal - ulice (eksperymentalnie)",
                wms_bdot,
                {
                    layers: "prg-ulice",
                    transparent: "true",
                    format: "image/png",
                    version: "1.3.0",
                },
                {
                    tileSize: tileSizeG,
                    isBaseLayer: false,
                    visibility: false,
                    uniqueName: "ulice",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: true,
                    getFullRequestString: getFullRequestString4326
                }
            );

            if ("undefined" != typeof I18n.translations.en) {
                I18n.translations.en.layers.name["ulice"] = "Geoportal - ulice (eksperymentalnie)";
            }
    
            if ("undefined" != typeof I18n.translations.pl) {
                I18n.translations.pl.layers.name["ulice"] = "Geoportal - ulice (eksperymentalnie)";
            }

            var geop_rail = new OpenLayers.Layer.WMS(
                "Geoportal - przejazdy kolejowe",
                wms_rail,
                {
                    layers: "PMT_Linie_Kolejowe_Sp__z_o_o_,Kopalnia_Piasku_KOTLARNIA_-_Linie_Kolejowe_Sp__z__o_o_,Jastrzębska_Spółka_Kolejowa_Sp__z_o_o_,Infra_SILESIA_S_A_,EUROTERMINAL_Sławków_Sp__z_o_o_,Dolnośląska_Służba_Dróg_i_Kolei_we_Wrocławiu,CTL_Maczki-Bór_S_A_,CARGOTOR_Sp__z_o_o_,PKP_SKM_w_Trójmieście_Sp__z_o_o_,PKP_Linia_Hutnicza_Szerokotorowa_Sp__z_o__o_,PKP_Polskie_Linie_Kolejowe",
                    transparent: "true",
                    format: "image/png",
                    version: "1.3.0",
                },
                {
                    tileSize: tileSizeG,
                    isBaseLayer: false,
                    visibility: false,
                    uniqueName: "rail",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: true,
                    getFullRequestString: getFullRequestString4326
                }
            );

            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["rail"] = "Geoportal - przejazdy kolejowe";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["rail"] = "Geoportal - przejazdy kolejowe";
            }

            var tileSizeMil = new window.OpenLayers.Size(2048,2048);
            var geop_mileage = new OpenLayers.Layer.WMS(
                "Geoportal - pikietaz",
                wms_mileage,
                {
                    layers: "pikietaz",
                    transparent: "true",
                    format: "image/png",
                    version: "1.1.1",
                },
                {
                    tileSize: tileSizeMil,
                    isBaseLayer: false,
                    visibility: false,
                    uniqueName: "mileage",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: false,
                    getFullRequestString: getFullRequestString4326
                }
            );

            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["rail"] = "Geoportal - pikietaz";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["rail"] = "Geoportal - pikietaz";
            }

            var geop_parcels = new OpenLayers.Layer.WMS(
                "Geoportal - podział adm",
                wms_parcels,
                {
                    layers: "dzialki,numery_dzialek",
                    transparent: "true",
                    format: "image/png",
                    version: "1.1.1",
                },
                {
                    tileSize: tileSizeMil,
                    isBaseLayer: false,
                    visibility: false,
                    uniqueName: "parcels",
                    epsg900913: epsg900913,
                    epsg4326: epsg4326,
                    getURL: getUrl4326,
                    ConvTo2180: ConvTo2180,
                    ep2180: false,
                    getFullRequestString: getFullRequestString4326
                }
            );

            if ("undefined" != typeof I18n.translations.en) {
            I18n.translations.en.layers.name["parcels"] = "Geoportal - podział adm.";
            }

            if ("undefined" != typeof I18n.translations.pl) {
            I18n.translations.pl.layers.name["parcels"] = "Geoportal - podział adm.";
            }

            console.log('Geoportal: adding layers');
            if(my_wazeMap.getLayersByName("Geoportal - orto").length == 0)
            {
                my_wazeMap.addLayer(geop_orto);
                geoportalAddLayer(geop_orto);

                my_wazeMap.addLayer(geop_orto_high);
                geoportalAddLayer(geop_orto_high);

                //my_wazeMap.addLayer(geop_prng);
                //geoportalAddLayer(geop_prng);

                my_wazeMap.addLayer(geop_adresy2);
                geoportalAddLayer(geop_adresy2);

                my_wazeMap.addLayer(geop_ulice);
                geoportalAddLayer(geop_ulice);

                my_wazeMap.addLayer(geop_miejsca);
                geoportalAddLayer(geop_miejsca);

                my_wazeMap.addLayer(geop_rail);
                geoportalAddLayer(geop_rail);

                my_wazeMap.addLayer(geop_mileage);
                geoportalAddLayer(geop_mileage);

                my_wazeMap.addLayer(geop_parcels);
                geoportalAddLayer(geop_parcels);

                console.log('Geoportal: layers added');
                this.OrtoTimer();
            }
        }

        GEOPORTAL.OrtoTimer = function() {
            setTimeout(function(){
                var a = window.W.map.getLayersBy("uniqueName","orto1");
                if (a[0]) {
                    a[0].setZIndex(2050);
                }

                var b = window.W.map.getLayersBy("uniqueName","ortoHigh");
                if (b[0]) {
                    b[0].setZIndex(2050);
                }

                var google_map = window.W.map.getLayersBy("uniqueName","satellite_imagery");
                if (google_map[0]) {
                    google_map[0].setZIndex(1); // mapy Googla
                }

                GEOPORTAL.OrtoTimer();
            },1000);
        }

        GEOPORTAL.initBootstrap = function() {
            try {
                if (document.getElementById('layer-switcher-group_display') != null) {
                    this.init(window.W.map);
                } else {
                    console.log("Geoportal: WME not initialized yet, trying again later.");
                    setTimeout(function(){
                        GEOPORTAL.initBootstrap();
                    },1000);
                }
            } catch (err) {
                console.log(err);
                console.log("Geoportal: WME not initialized yet, trying again later.");
                setTimeout(function(){
                    GEOPORTAL.initBootstrap();
                },1000);
            }
        }
        GEOPORTAL.initBootstrap();
    }
    geoportal_run();

})();
