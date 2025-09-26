const _ = require('lodash'),
  FLOW_TYPE = {
    authorizationCode: 'authorization_code',
    implicit: 'implicit',
    password: 'password_credentials',
    clientCredentials: 'client_credentials'
  };

/**
 * Generate auth for collection/request
 */

module.exports = function (openapi, securitySet) {
  let securityDef, helper;

  // return false if security set is not defined
  // or is an empty array
  // this will set the request's auth to null - which is 'inherit from parent'
  if (!securitySet || (Array.isArray(securitySet) && securitySet.length === 0)) {
    return null;
  }

  _.forEach(securitySet, (security) => {
    if (_.isObject(security) && _.isEmpty(security)) {
      helper = {
        type: 'noauth'
      };
      return false;
    }

    securityDef = _.get(openapi, ['securityDefs', Object.keys(security)[0]]);

    if (!_.isObject(securityDef)) {
      return;
    }

    else if (securityDef.type === 'http') {
      if (_.toLower(securityDef.scheme) === 'basic') {
        helper = {
          type: 'basic',
          basic: [
            { key: 'username', value: '{{basicAuthUsername}}' },
            { key: 'password', value: '{{basicAuthPassword}}' }
          ]
        };
      }

      else if (_.toLower(securityDef.scheme) === 'bearer') {
        helper = {
          type: 'bearer',
          bearer: [{ key: 'token', value: '{{bearerToken}}' }]
        };
      }

      else if (_.toLower(securityDef.scheme) === 'digest') {
        helper = {
          type: 'digest',
          digest: [
            { key: 'username', value: '{{digestAuthUsername}}' },
            { key: 'password', value: '{{digestAuthPassword}}' },
            { key: 'realm', value: '{{realm}}' }
          ]
        };
      }

      else if (_.toLower(securityDef.scheme) === 'oauth' || _.toLower(securityDef.scheme) === 'oauth1') {
        helper = {
          type: 'oauth1',
          oauth1: [
            { key: 'consumerSecret', value: '{{consumerSecret}}' },
            { key: 'consumerKey', value: '{{consumerKey}}' },
            { key: 'addParamsToHeader', value: true }
          ]
        };
      }
    }

    else if (securityDef.type === 'oauth2') {
      let flowObj, currentFlowType;

      helper = {
        type: 'oauth2',
        oauth2: []
      };

      if (_.isObject(securityDef.flows) && FLOW_TYPE[Object.keys(securityDef.flows)[0]]) {
        /*

        //===================[]========================\\
        ||  OAuth2 Flow Name || Key name in collection ||
        |]===================[]========================[|
        || clientCredentials || client_credentials     ||
        || password          || password_credentials   ||
        || implicit          || implicit               ||
        || authorizationCode || authorization_code     ||
        \\===================[]========================//
        Ref : https://swagger.io/docs/specification/authentication/oauth2/

        In case of multiple flow types, the first one will be preferred
        and passed on to the collection.

        Other flow types in collection which are not explicitly present in OA 3
        • "authorization_code_with_pkce"

        */
        currentFlowType = FLOW_TYPE[Object.keys(securityDef.flows)[0]];
        flowObj = _.get(securityDef, `flows.${Object.keys(securityDef.flows)[0]}`);
      }

      if (currentFlowType) { // Means the flow is of supported type

        // Fields supported by all flows -> refreshUrl, scopes
        if (!_.isEmpty(flowObj.scopes)) {
          helper.oauth2.push({
            key: 'scope',
            value: Object.keys(flowObj.scopes).join(' ')
          });
        }

        /* refreshURL is indicated by key 'redirect_uri' in collection
        Ref : https://stackoverflow.com/a/42131366/19078409 */
        if (!_.isEmpty(flowObj.refreshUrl)) {
          helper.oauth2.push({
            key: 'redirect_uri',
            value: _.isString(flowObj.refreshUrl) ? flowObj.refreshUrl : '{{oAuth2CallbackURL}}'
          });
        }

        // Fields supported by all flows except implicit -> tokenUrl
        if (currentFlowType !== FLOW_TYPE.implicit) {
          if (!_.isEmpty(flowObj.tokenUrl)) {
            helper.oauth2.push({
              key: 'accessTokenUrl',
              value: _.isString(flowObj.tokenUrl) ? flowObj.tokenUrl : '{{oAuth2AccessTokenURL}}'
            });
          }
        }

        // Fields supported by all flows all except password, clientCredentials -> authorizationUrl
        if (currentFlowType !== FLOW_TYPE.password && currentFlowType !== FLOW_TYPE.clientCredentials) {
          if (!_.isEmpty(flowObj.authorizationUrl)) {
            helper.oauth2.push({
              key: 'authUrl',
              value: _.isString(flowObj.authorizationUrl) ? flowObj.authorizationUrl : '{{oAuth2AuthURL}}'
            });
          }
        }

        helper.oauth2.push({
          key: 'grant_type',
          value: currentFlowType
        });
      }
    }

    else if (securityDef.type === 'apiKey') {
      helper = {
        type: 'apikey',
        apikey: [
          {
            key: 'key',
            value: _.isString(securityDef.name) ? securityDef.name : '{{apiKeyName}}'
          },
          { key: 'value', value: '{{apiKey}}' },
          {
            key: 'in',
            value: _.includes(['query', 'header'], securityDef.in) ? securityDef.in : 'header'
          }
        ]
      };
    }

    // stop searching for helper if valid auth scheme is found
    if (!_.isEmpty(helper)) {
      return false;
    }
  });
  return helper;
};
