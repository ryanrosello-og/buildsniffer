const path = require('path')
const fs = require('fs')
const moment = require('moment')
const log = require('electron-log')

module.exports = {
  validateConfig(config) {
    var hasErrors = false;
    var errorMessages = []

    return {
      hasErrors: hasErrors,
      errors: errorMessages
    }
  },
  setConfig(config, configPath) {
    let data = JSON.stringify(config);
    fs.writeFileSync(configPath, data);
  },
  getResource(resource) {
    try {
      return path.join(__dirname, resource);
    } catch (err) {
      log.error(err)
      throw new Error('Failed to find resource')
    }
  },
  getConfig(config) {
    try {
      let dataPath = this.getResource(config);      
      data = JSON.parse(fs.readFileSync(dataPath));
      
      if (data.tfsOrazure.toLowerCase() != 'tfs' && data.tfsOrazure.toLowerCase() != 'azure') {
        let error = 'Unable to determine configuration [tfsOrazure], valid value: "tfs" or "azure"'
        log.error(error)
        throw new Error(error)
      }

      log.info('Loaded config: ', data)
      return data
    } catch (err) {
      log.error(err)
      throw new Error(err)
    }
  },
  parseResponse(data) {
    let buildInfo, icon, deployStatus, releaseName, completedOn, branch = ''
    if(this.isJson(data)) {
      buildData = data
    } else {
      buildData = JSON.parse(data)
    }   
    
    if(buildData.count == 0) { return null }

    releaseName = buildData.value[0].release.name
    if(buildData.value[0].completedOn != '0001-01-01T00:00:00' && moment(buildData.value[0].completedOn).fromNow() != undefined) {
      completedOn = `completed ${moment(buildData.value[0].completedOn).fromNow()}`
    } 
    
    msg = `${releaseName} ${completedOn}`
    deployStatus = buildData.value[0].deploymentStatus

    if (deployStatus == 'succeeded') {
      buildInfo = `✅ ${msg}`
      icon = 'img_pass.png'            
    } else if (deployStatus == 'failed') {
      buildInfo = `❌ ${msg}`
      icon = 'img_fail.png'
    } else {
      buildInfo = `ᕕ(ᐛ)ᕗ ${msg}`
      icon = 'img_icons8-final-state-40.png'
    }

    if(buildData.value[0].release.artifacts.length > 0) {
      branch = buildData.value[0].release.artifacts[0].definitionReference.branch.name
    }
    
    let requestedFor = buildData.value[0].requestedFor.displayName

    return {
      tooltip: buildInfo,
      toastMessage: `${branch} Requested for: ${requestedFor} `,
      icon: icon,
      msg: msg,
      releaseName: buildData.value[0].release.name,      
      deploymentStatus: deployStatus,
      requestedFor: buildData.value[0].requestedFor.displayName,
      completedOn:  completedOn,
      releaseUrl: buildData.value[0].release.webAccessUri 
    }
  },
  isJson(obj)
  {
      return obj !== undefined && obj !== null && obj.constructor == Object;
  },  
  getUrl(appConfig) {
    let url = ''

    if (appConfig.tfsOrazure.toLowerCase() == 'tfs') {
      let tfsReleaseDefinitionId = appConfig.tfs.releaseDefinitionId ? `&definitionId=${appConfig.tfs.releaseDefinitionId}` : ''
      let tfsEnvironmentId = appConfig.tfs.environmentId ? `&definitionEnvironmentId=${appConfig.tfs.environmentId}` : ''
      url = `https://${appConfig.tfs.instance}/${appConfig.tfs.collection}/${appConfig.tfs.project}/_apis/release/deployments?api-version=${appConfig.tfs.apiVersion}&ReleaseQueryOrder=descending&$top=1${tfsReleaseDefinitionId}${tfsEnvironmentId}`
    } else {
      let azureReleaseDefinitionId = appConfig.azure.releaseDefinitionId ? `&definitionId=${appConfig.azure.releaseDefinitionId}` : ''
      let azureEnvironmentId = appConfig.azure.environmentId ? `&definitionEnvironmentId=${appConfig.azure.environmentId}` : ''
      url = `https://vsrm.dev.azure.com/${appConfig.azure.organization}/${appConfig.azure.project}/_apis/release/deployments?api-version=${appConfig.azure.apiVersion}&ReleaseQueryOrder=descending&$top=1${azureReleaseDefinitionId}${azureEnvironmentId}`
    }
    log.info('getUrl=> ', url)
    return url
  },
  generateAuthToken(username, pat) {
    return 'Basic ' + Buffer.from(`${username}:${pat}`).toString('base64')
  }
};

