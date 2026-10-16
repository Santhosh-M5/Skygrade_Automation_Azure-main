module.exports = {
  
  morpheus: {
    username: 'skygrade-dev-user',
    password: 'Skygrade2025#'
  },
  plntab:{
    applicationName: 'NonMainframe',
    searchText: 'EndtoEndtest',
  },
    providerPlatforms: {
    AWS: {
      platforms: ['EKS', 'EC2', 'ECS', 'Lambda', 'Beanstalk'],
      clusterVisibleFor: ['EKS'],
    },
    Azure: {
      platforms: ['AKS', 'App Service', 'Azure Function', 'Azure VM', 'Azure Container Apps'],
      clusterVisibleFor: ['AKS'],
    },
    GCP: {
      platforms: ['GKE', 'Compute Engine', 'Cloud Run', 'Cloud Functions', 'App Engine'],
      clusterVisibleFor: ['GKE'],
    },
  },
  analysiscomparison: {
        searchText: 'skipped1',//EndtoEndtest
        applicationName: 'Skipped1'//Nonmainframe
    },
  cast: {
        email:'Santhosh.M21dd6e@cognizant.com',
        password:'#Dolbyatmos@007'
    },
  AppEng: {
    searchText: 'EndtoEndtest',
    applicationName: 'NonMainframe',
    orderApplicationName: 'OrderManagement',
    tagId: '38bfd7a3-2553-4e51-8cb6-fcfa55dc9ffc'
    },
  vFunction: {
    email: 'skygrade-dev@cognizant.com',
    password: 'Password1!'
    },
  LiftAndShift: {
    applicationName: 'NMFrehost',
    comparisonApplication: 'NMFrehost',
    invalidAppName: 'NMFrehost3'
    },

    
    matilda: {
    username: 'migrationadmin@matildacloud.com',
    password: 'MatildaDemo1'
    },

    toolsToggle: {
    applicationName: 'Skipped1',
    },

  containerizeApp: {
        applicationName: process.env.APP_NAME || 'NMFrehost',
        chai: {
            email: process.env.CHAI_EMAIL || 'onprem@cloudhedge.io',
            password: process.env.CHAI_PASSWORD || 'Skygrade@123',
        },
        vaults: {
            linuxBasicVaultLabel: 'Basic Auth (swapnil)',
            linuxSshVaultLabel: 'hiii-vault',
            windowsVaultLabel: 'Basic Auth (swapnil)',
        },
    },
    pipeline: {
        searchText: 'EndtoEndTest',
        applicationName: 'NMFCICD',
    },

    InfraEng: {
    searchText: 'EndtoEndtest',
    applicationName: 'NonMainframe',
    crossProviderAppStack: 'NonMainframe',
    invalidAppStack: 'nmfrehost',
    validAppStack: 'NMFrehost'
    },
    stackgen: {
        email:'Santhosh.M21dd6e@cognizant.com',
        password:'#Dolbyatmos@007'
    },
    clusterAnalysis:  
    {
    clusterName: 'EndtoEndTest',
    expectedDispositions: ['Rehost', 'Refactor', 'Rearchitect', 'Rebuild', 'Retire'],
    },
    dependencyTreeWalk: 
    {
    applicationName: 'NMFrehost',
    bulkSearchText: 'main',
    level1AppNames: ['NonMainframe', 'NMFCICD'],
    },
    nonMainframe: {
    refactor:{
      appName:"azureappanalysis2002",
      clusterName:"Newportfolio",
      searchCluster:"Newport",
    },
    rearchitect: {
      appName: 'azureappanalysis2002',       
      clusterName: 'Newportfolio',   
      searchCluster: 'Newport',     
    },
    rehost: {
      appName: 'RehostAuto',     
      clusterName:'Fullflow',     
      searchCluster:'Fullfl'   
    },
    retire: {
      appName: 'NerdDinner_1788762122837',        
      clusterName: 'QACluster_737',    
      searchCluster: 'QACluster_737',  
    },
    rehostrearchitect: {
      appName: 'NonMaintest01',//	RehostAuto
      clusterName: 'NonMain',//fullflow
      searchCluster: 'NonMain',//fullfl
    },
  },


};
