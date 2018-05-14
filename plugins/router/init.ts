import {HTTPService} from "../../modules/HTTPService";
import {init_chain} from "../../app";
import ServerError from "../../classes/ServerError";
import * as env from "../../env.json";
import * as rp from "request-promise";
import * as xregexp from "xregexp";
import * as Promise from "bluebird";
import * as _ from "lodash";

init_chain.addPromise("route", resolve => {
  
  const host = "http://192.168.0.1";
  const type = {
    "password_24ghz": "/wlsecrefresh.wl"
  };
  const key_map = {
    "Board ID:":                                "board_id",
    "Symmetric CPU Threads:":                   "symmetric_cpu_threads",
    "Build Timestamp:":                         "time_build",
    "Linux Version:":                           "version_unix",
    "DSL PHY and Driver Version:":              "version_driver_dsl_phy",
    "Systime:":                                 "time_system",
    "Standard Specification Compliant":         "version_standard",
    "Hardware Version":                         "version_hardware",
    "Wireless Driver Version:":                 "version_driver_wireless",
    "Software Version":                         "version_software",
    "Cable Modem Serial Number":                "serial_number_modem",
    "CM certificate":                           "status_certificate",
    "WAN Hardware Address:":                    "address_wan",
    "CM Hardware Address:":                     "address_cm",
    "LAN Hardware Address:":                    "address_lan",
    "System Up Time":                           "time_uptime",
    "Network Access":                           "status_access",
    "Cable Modem IP Address":                   "ip_address_modem",
    "Board Temperature":                        "status_temperature",
    "Moca Version:":                            "version_moca",
    "Voice Service Version:":                   "version_voice_service",
    "Traffic Type:":                            "type_traffic",
    "Aggregate Line Rate - Upstream (Kbps):":   "upstream_aggregate",
    "Aggregate Line Rate - Downstream (Kbps):": "downstream_aggregate",
    "B0 Traffic Type:":                         "type_traffic_b0",
    "B0 Line Rate - Upstream (Kbps):":          "upstream_b0",
    "B0 Line Rate - Downstream (Kbps):":        "downstream_b0",
    "B1 Traffic Type:":                         "type_traffic_b1",
    "B1 Line Rate - Upstream (Kbps):":          "upstream_b1",
    "B1 Line Rate - Downstream (Kbps):":        "downstream_b1",
    "Line Rate - Upstream (Kbps):":             "upstream_standard",
    "Line Rate - Downstream (Kbps):":           "downstream_standard",
    "Date/Time:":                               "time_now",
    "WAN IP address":                           "ip_address_wan"
  };
  
  function key(key: string): string {
    return key_map[key] || key;
  }
  
  function value(value: string): number | string {
    return `${+value}` === value ? +value : value;
  }
  
  HTTPService.addParam("type", "/api/router", (request, response, next, value) => {
    request.params.type = value;
    return next();
  });
  
  HTTPService.addRoute("GET", "/api/router", HTTPService.auth, (request, response) => {
    const data = {general: {}, wifi_24ghz: {}, wifi_50ghz: {}, security_24ghz: {}, security_50ghz: {}};
    return rp({uri: host, auth: env.plugin.router.auth})
    .catch(err => err)
    .then(() =>
      Promise.all([
        rp({uri: host + "/info.html", headers: {referer: host}, auth: env.plugin.router.auth})
        .then(res => {
          xregexp.forEach(res, /<tr>(?:.|\n)*?<td[\w\d\s'=]*>(?:<b>)?([^<]*)(?:<\/b>)?<\/td>(?:.|\n)*?<td[\w\d\s'=]*>(?:<b>)?([^<]*)<\/td>(?:.|\n)*?<\/tr>/g, match => data.general[key(match[1])] = value(match[2]));
        }),
        rp({uri: host + "/wlswitchinterface0.wl", headers: {referer: host}, auth: env.plugin.router.auth})
        .then(res => {
          xregexp.forEach(res, /^var ([\w\d_]+) ?= ?'((?:[^']*)|\/[\w\d]*\/[\w]*)';?\n/gm, match => data.wifi_24ghz[key(match[1])] = value(match[2]));
          xregexp.forEach(res, /<input[\w\s\d=']*?name='([\w\d\s-]*)'[\w\s\d=']*?value='(?!ON)([\w\d\s-]*)'>/g, match => data.wifi_24ghz[key(match[1])] = value(match[2]));
        }),
        rp({uri: host + "/wlswitchinterface1.wl", headers: {referer: host}, auth: env.plugin.router.auth})
        .then(res => {
          xregexp.forEach(res, /^var ([\w\d_]+) ?= ?'((?:[^']*)|\/[\w\d]*\/[\w]*)';?\n/gm, match => data.wifi_50ghz[key(match[1])] = value(match[2]));
          xregexp.forEach(res, /<input[\w\s\d=']*?name='([\w\d\s-]*)'[\w\s\d=']*?value='(?!ON)([\w\d\s-]*)'>/g, match => data.wifi_50ghz[key(match[1])] = value(match[2]));
        }),
        rp({uri: host + "/wlsecrefresh.wl", headers: {referer: host}, auth: env.plugin.router.auth})
        .then(res => {
          xregexp.forEach(res, /^var ([\w\d_]+) ?= ?'((?:[^']*)|\/[\w\d]*\/[\w]*)';?\n/gm, match => data.security_24ghz[key(match[1])] = value(match[2]));
        }),
        rp({uri: host + "/wlsecurity.wl", headers: {referer: host}, auth: env.plugin.router.auth})
        .then(res => {
          xregexp.forEach(res, /^var ([\w\d_]+) ?= ?'((?:[^']*)|\/[\w\d]*\/[\w]*)';?\n/gm, match => data.security_24ghz[key(match[1])] = value(match[2]));
        })
      ])
      .then(() => response.json(HTTPService.response(data)))
      .catch(() => response.status(500).json(HTTPService.response(new ServerError(500, "any"))))
    );
  });
  
  HTTPService.addRoute("PUT", "/api/router/:type", HTTPService.auth, (request, response) => {
    return rp({uri: host, auth: env.plugin.router.auth})
    .catch(err => err)
    .then(() =>
      rp({uri: host + type[request.params.type], auth: env.plugin.router.auth})
      .then(res => {
        const sessionkey = xregexp.exec(res, /var\s*sessionKey\s*=\s*'([\d]+)';\n`?/g)[1];
        update[request.params.type](_.merge(request.body, {session_key: sessionkey}));
      })
      .then(() => response.json(HTTPService.response(new ServerError(200, "any"))))
      .catch(() => response.status(500).json(HTTPService.response(new ServerError(500, "any"))))
    );
  });
  
  const update = {};
  
  // Promise.all(_.map(["/api/user", "/api/user/login"], path =>
  //   new Promise((resolve, reject) =>
  //     new Route({method: "POST", path: path, flag_active: 1}).validate()
  //     .then(res =>
  //       res.exists ? resolve(res) : res.save()
  //       .then(res => resolve(res))
  //       .catch(err => reject(err))
  //     )
  //     .catch(err => reject(err))
  //   )))
  // .then(() => {
  //   HTTPService.listen()
  //   .then(res => resolve(res))
  //   .catch(err => reject(err));
  // })
  // .catch(err => reject(err));
  
  resolve();
  
});

