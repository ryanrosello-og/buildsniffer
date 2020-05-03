const path = require('path')
const moment = require('moment')
const log = require('electron-log')
const Store = require('electron-store')

module.exports = {
  validateConfig(config) {    
    var errorMessages = []

    if(this.isEmpty(config.pat)) { errorMessages.push('PAT token is required') }
    if(this.isEmpty(config.username)) { errorMessages.push('username is required') }
    if(this.isEmpty(config.pollInterval)) { errorMessages.push('pollInterval is required') }
    if(this.isEmpty(config.failureThreshold)) { errorMessages.push('failureThreshold is required') }
    if(this.isEmpty(config.tfsOrazure)) { errorMessages.push('tfsOrazure token is required') }

    if(config.tfsOrazure == 'tfs') {
      if(this.isEmpty(config.tfs.instance)) { errorMessages.push('tfs instance is required') }
      if(this.isEmpty(config.tfs.collection)) { errorMessages.push('tfs collection is required') }
      if(this.isEmpty(config.tfs.project)) { errorMessages.push('tfs project is required') }
      if(this.isEmpty(config.tfs.apiVersion)) { errorMessages.push('tfs apiVersion is required') }
    } else if(config.tfsOrazure == 'azure') {
      if(this.isEmpty(config.azure.organization)) { errorMessages.push('azure organization is required') }
      if(this.isEmpty(config.azure.project)) { errorMessages.push('azure project is required') }
      if(this.isEmpty(config.azure.apiVersion)) { errorMessages.push('azure apiVersion is required') }
    } else {
      errorMessages.push('tfsOrazure value can either be "tfs" or "azure"')
    }

    return {
      hasErrors: errorMessages.length > 0 ? true : false,
      errors: errorMessages
    }
  },
  isEmpty(str) {
    return (!str || 0 === str.length);
  },
  setConfig(config) {
    try{
      const store = new Store();

      store.set(config);
      return {
        hasErrors: false,
        errors: []
      }      
    } catch (e) {
      return {
        hasErrors: true,
        errors: e
      }
    }
  },
  getResource(resource) {
    try {
      return path.join(__dirname, resource);
    } catch (err) {
      log.error(err)
      throw new Error('Failed to find resource')
    }
  },
  getConfig() {
    const store = new Store();
    return store.store
  },
  initConfig() {
    const store = new Store();
    store.set({
      failureThreshold: 10,      
      pollInterval: 5000,
      pat: '<pat here>',
      username: '<user name here>',
      tfsOrazure: 'azure',
      tfs: {
        apiVersion: '4.1-preview.2',
        collection: '',
        environmentId: '',
        instance: '',
        project: '',
        releaseDefinitionId: ''
      },
      azure:{
        apiVersion: '5.1',
        environmentId: '',
        organization: 'ryanrosello0326',
        project: 'teTs',
        releaseDefinitionId: '',
      }
    });
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
      requestedFor: `Requested for: ${requestedFor} `,
      branch: branch =='' ? 'Build Notification' : branch,
      icon: icon,
      msg: msg,
      releaseName: buildData.value[0].release.name,      
      deploymentStatus: deployStatus,
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

