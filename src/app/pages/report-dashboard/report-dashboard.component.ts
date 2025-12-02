import { Component, AfterViewInit, IterableDiffers } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { transform, fromLonLat, transformExtent } from 'ol/proj';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { CommanService } from '../../services/comman.service';
import ImageWMS from 'ol/source/ImageWMS.js';
import ImageLayer from 'ol/layer/Image.js';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {bbox as bboxStrategy} from 'ol/loadingstrategy';
import { Style, Fill, Stroke, Icon, Text } from 'ol/style';
import { getCenter } from 'ol/extent';
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';
@Component({
  selector: 'app-report-dashboard',
  templateUrl: './report-dashboard.component.html',
  styleUrl: './report-dashboard.component.scss'
})
export class ReportDashboardComponent {

constructor(private commanService:CommanService){}

selectedLevel:any
levelOptionList:any = [
  {name:'District' , value:1},
  {name:'Taluka' , value:2},
]

domicileOptionList:any = [
  {name:'Yes' , value:true},
  {name:'No' , value:false}
]
selectedDomicileOption:any
selectedDisabilityOption:any

onLevelSelect(){
  this.selectedDistrict = null
  this.selectedTaluka = null
  this.selectedVillage = null
  this.cqlDistrict = []
  this.cqlSubDistrict = []
  this.cqlVillage = []


  let payload = {
    "level": this.selectedLevel,
    "filterdata": ""
  }
  this.commanService.loaderSpinShow()
  this.commanService.getDTVCount(payload).subscribe((res:any)=>{
      this.commanService.loaderSpinHide()
      if(payload.level == 1){
        this.selectedlayerNameForCount = 'lgd_d'
        this.displayCountAndBoundary(res,"krishi-dss:india_district", this.selectedlayerNameForCount)
      }
      else{
        this.selectedlayerNameForCount = 'lgd_t'
        this.displayCountAndBoundary(res,"krishi-dss:india_taluka", this.selectedlayerNameForCount)
      }
  },
  (error)=>{
    this.commanService.loaderSpinHide()
  }
  )


  // this.displayBoundryLayer()
}
setDefaultView(){
  this.selectedLevel = 1
  this.selectedDistrict = null
  this.selectedTaluka = null
  this.selectedVillage = null
  this.cqlDistrict = []
  this.cqlSubDistrict = []
  this.cqlVillage = []
  // this.displayBoundryLayer()
  this.onLevelSelect()
}
  ngOnInit() {
  
  }

  map!: Map;

  ngAfterViewInit(): void {
    this.initmap()
    this.getAllAreaDropDownList()
  }

  view: any;
  initmap(){
    this.view = new View({
      center: fromLonLat([78.781414, 22.164514]),
      zoom: 5,
     
    });
    const satelliteSource = new XYZ({
      url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    });
    const satelliteLayer = new TileLayer({
      source: satelliteSource,
    });

    const indiaExtent :any= [68.7, 6.5, 97.4, 35.5];
    const centerX = (indiaExtent[0] + indiaExtent[2]) / 2;
    const centerY = (indiaExtent[1] + indiaExtent[3]) / 2;
    const center = [centerX, centerY];
    const transformedCenter = transform(center, 'EPSG:4326', 'EPSG:3857');
    this.map= new Map({
      target: 'map',
      layers: [satelliteLayer],
      view: this.view,
    });
    // this.map.on('singleclick', (event: any) => {

    //   const viewResolution = this.view.getResolution();
    
    //   // 🔥 Only get visible boundary layer
    //   const visibleLayer = this.getActiveVisibleBoundaryLayer();
    
    //   if (!visibleLayer) {
    //     console.warn("No visible boundary layer found.");
    //     return;
    //   }
    
    //   const source = visibleLayer.getSource();
    
    //   const url = source.getFeatureInfoUrl(
    //     event.coordinate,
    //     viewResolution,
    //     'EPSG:3857',
    //     { 'INFO_FORMAT': 'application/json' }
    //   );
    
    //   if (!url) return;
    
    //   fetch(url)
    //     .then((res:any) => res.json())
    //     .then((data:any) => {
    //       if (!data.features?.length) return;
    
    //       const props = data.features[0].properties;
    //       console.log(props);
          
    //       // 🔥 Now no mismatch - only valid level returned
    //       if (props?.lgd_v) {
    //         this.displayHighlightedBoundary(props.lgd_v, "krishi-dss:india_villages", "lgd_v");
    //       } else if (props?.lgd_t) {
    //         this.displayHighlightedBoundary(props.lgd_t, "krishi-dss:india_taluka", "lgd_t");
    //       } else if (props?.lgd_d) {
    //         this.displayHighlightedBoundary(props.lgd_d, "krishi-dss:india_district", "lgd_d");
    //       } else if (props?.lgd_s) {
    //         this.displayHighlightedBoundary(props.lgd_s, "krishi-dss:india_states", "lgd_s");
    //       }
    //     })
    //     .catch((err:any) => console.error("Feature Info Error", err));
    // });
    

    this.setDefaultView()
   
  }
// Returns the appropriate ImageWMS source based on current zoom level from available boundary layers.


getActiveVisibleBoundaryLayer(){
  if (!this.boundaryLayers || this.boundaryLayers.length === 0) return null;

  for (const bLayer of this.boundaryLayers) {
    if (bLayer.layer && bLayer.layer.getVisible()) {
      return bLayer.layer; // Return first visible boundary layer
    }
  }
  return null;
}

  districtList:any = []
  talukaList:any = []
  villageList:any = []

  getAllAreaDropDownList(){
    this.commanService.getOrganizationDistricts().subscribe((response:any)=>{
      this.districtList = response
    })
    this.commanService.getAllOrganizationTalukaByDistricts().subscribe((response:any)=>{
      this.talukaList = response
    })
  }

  selectedDistrict:any
  selectedTaluka:any
  selectedVillage:any


  getTalukaListByDistrictId(){
  this.selectedLevel = null
  this.selectedTaluka = null
  this.talukaList = []
  this.selectedVillage = null
  this.villageList = []
  this.cqlSubDistrict = []
  this.cqlVillage = []
    if(this.selectedDistrict){
      this.commanService.getOrganizationTalukaByDistrictids(this.selectedDistrict.id).subscribe((response:any)=>{
        this.talukaList = response
      })
      this.cqlDistrict = [this.selectedDistrict.lgdcode ]
      this.displayBoundryLayer()
    }
    else{
      this.cqlDistrict = []
      this.setDefaultView()
    }

  }

  getVillageListByTalukaId(){
    this.selectedLevel = null
    this.selectedVillage = null
    this.villageList = []
    this.cqlVillage = []
    if(this.selectedTaluka){
      this.commanService.getOrganizationVillagesByTalukas(this.selectedTaluka.id).subscribe((response:any)=>{
        this.villageList = response
      })
      this.cqlSubDistrict = [this.selectedTaluka.lgdcode]
      this.displayBoundryLayer()
    }
    else{
      this.cqlSubDistrict = []
      this.displayBoundryLayer()
    }
  }


  onVillageSelect(){
    this.selectedLevel = null
    if(this.selectedVillage){
      this.cqlVillage = [this.selectedVillage.lgdcode]
      this.displayBoundryLayer()
    }
    else{
        this.cqlVillage = []
        this.displayBoundryLayer()
    }
  }

largeMapView:boolean = false
  toggleMapZoom(){
      this.largeMapView = !this.largeMapView
  }

  boundaryLayers:any = [
    { name: 'krishi-dss:india_states', layer: null, visible: true },
    { name: 'krishi-dss:india_district', layer: null, visible: true },
    { name: 'krishi-dss:india_taluka', layer: null, visible: true },
    { name: 'krishi-dss:india_villages', layer: null, visible: true }
  ];

  URL_WFS:any = 'https://preprod-kdss.da.gov.in/geoserver/krishi-dss/wms'
  cqlState:any = [27]
  cqlDistrict:any = []
  cqlSubDistrict:any = []
  cqlVillage :any= []
  displayBoundryLayer() {
    if (this.highlightBoundaryLayer) {
      this.map.removeLayer(this.highlightBoundaryLayer);
    }
  
    // Remove previous layers
    this.boundaryLayers.forEach((bLayer: any) => {
      if (bLayer.layer) {
        this.map.removeLayer(bLayer.layer);
        bLayer.layer = null;
      }
    });
  
    const toArray = (v: any) => Array.isArray(v) ? v : (v ? [v] : []);
  
    // local copies
    const villages = toArray(this.cqlVillage);
    const talukas = toArray(this.cqlSubDistrict);
    const districts = toArray(this.cqlDistrict);
    const states = toArray(this.cqlState);
  
    // If any explicit CQL selection exists, we must clear selectedLevel (per requirement)
    if ((districts && districts.length > 0) || (talukas && talukas.length > 0) || (villages && villages.length > 0)) {
      this.selectedLevel = null;
    }
  
    // If selectedLevel is provided, override lower-level selections (treat them as empty)
    const selLevel = this.selectedLevel || null; // 'lgd_d' | 'lgd_t' | null
    let useDistricts: any[] = districts;
    let useTalukas: any[] = talukas;
    let useVillages: any[] = villages;
  
    if (selLevel) {
      // when selectedLevel present, treat lower-level CQL arrays as empty (per requirement)
      useDistricts = [];
      useTalukas = [];
      useVillages = [];
    }
  
    // Determine activeLevel by priority or by special cql-driven rules when selectedLevel is null
    let activeLevel: 'village' | 'taluka' | 'district' | 'state' | null = null;
  
    // Special branch: when selectedLevel exists (lgd_d/lgd_t) -> follow that
    if (selLevel === 'lgd_d') {
      activeLevel = 'district';
    } else if (selLevel === 'lgd_t') {
      activeLevel = 'taluka';
    } else {
      // selectedLevel is null -> check explicit CQL arrays with your new rules:
      if (villages && villages.length > 0) {
        // highest priority: village present -> show that village only
        activeLevel = 'village';
      } else if (talukas && talukas.length > 0) {
        // taluka present but no village -> show villages inside these talukas (special)
        // we'll represent this by setting activeLevel = 'village' but mark a flag to use taluka->village filter
        activeLevel = 'village';
      } else if (districts && districts.length > 0) {
        // district present but no taluka/village -> show talukas inside these districts (special)
        activeLevel = 'taluka';
      } else if (states && states.length > 0) {
        activeLevel = 'state';
      } else {
        activeLevel = null;
      }
    }
  
    // Format values for CQL (quote strings if needed)
    const formatValues = (arr: any[]) => {
      if (!arr || arr.length === 0) return '';
      const isString = typeof arr[0] === 'string';
      return arr.map(v => isString ? `'${v}'` : v).join(',');
    };
  
    // Prepare CQL filters
    let stateCql = '';
    let districtCql = '';
    let talukaCql = '';
    let villageCql = '';
    let lgdCode: any = null;
  
    // Handle cases
  
    if (selLevel === 'lgd_d') {
      // show districts of selected states (only district layer)
      const vals = formatValues(states);
      districtCql = vals ? `lgd_s IN (${vals})` : '';
      lgdCode = states[0] ?? null;
      this.selectedlayerNameForZoom = 'lgd_s';
      this.selectedlayerNameForCount = 'lgd_d'
    } else if (selLevel === 'lgd_t') {
      // show talukas of selected states (only taluka layer)
      const vals = formatValues(states);
      talukaCql = vals ? `lgd_s IN (${vals})` : '';
      lgdCode = states[0] ?? null;
      this.selectedlayerNameForZoom = 'lgd_s';
      this.selectedlayerNameForCount = 'lgd_d'
    } else {
      // selectedLevel is null -> apply CQL according to explicit arrays and new rules
  
      // Case A: villages explicitly selected -> show only those villages
      if (villages && villages.length > 0) {
        const vals = formatValues(villages);
        villageCql = vals ? `lgd_v IN (${vals})` : '';
        lgdCode = villages[0];
        this.selectedlayerNameForZoom = 'lgd_v';
        this.selectedlayerNameForCount = 'lgd_v'
        // visibility will be villages only (handled below)
      }
      // Case B: talukas explicitly selected (but no villages) -> show villages inside those talukas
      else if (talukas && talukas.length > 0) {
        const vals = formatValues(talukas);
        // We want to show villages inside selected talukas, so set villageCql by lgd_t
        villageCql = vals ? `lgd_t IN (${vals})` : '';
        lgdCode = talukas[0];
        // mark selectedlayerNameForZoom as taluka because selection came from taluka
        this.selectedlayerNameForZoom = 'lgd_t';
        this.selectedlayerNameForCount = 'lgd_v'
        // visibility will be villages only (handled below)
      }
      // Case C: districts explicitly selected (but no taluka/village) -> show talukas inside those districts
      else if (districts && districts.length > 0) {
        const vals = formatValues(districts);
        // show talukas inside these districts
        talukaCql = vals ? `lgd_d IN (${vals})` : '';
        lgdCode = districts[0];
        this.selectedlayerNameForZoom = 'lgd_d';
        this.selectedlayerNameForCount = 'lgd_t'
        // visibility will be talukas only (handled below)
      }
      // Case D: no explicit lower-level CQL -> fallback to priority (village>taluka>district>state)
      else if (activeLevel === 'village') {
        // This branch occurs if no explicit arrays but activeLevel derived from something else (unlikely)
        // leave empty or implement as needed
      } else if (activeLevel === 'taluka') {
        // no explicit arrays but taluka-level active -> similar to normal behavior (not common here)
      } else if (activeLevel === 'district') {
        // general district behavior if districts array was used earlier
      } else if (activeLevel === 'state') {
        const vals = formatValues(states);
        stateCql = vals ? `lgd_s IN (${vals})` : '';
        districtCql = vals ? `lgd_s IN (${vals})` : '';
        lgdCode = states[0] ?? null;
        this.selectedlayerNameForZoom = 'lgd_s';
        this.selectedlayerNameForCount = 'lgd_d'
      }
    }
  
    // call existing helper
    this.getFeaturesExtends(lgdCode);
  
    // mapping layer name => which filter to apply (if any)
    const layerFilterMap: { [key: string]: string } = {
      'krishi-dss:india_states': stateCql,
      'krishi-dss:india_district': districtCql,
      'krishi-dss:india_taluka': talukaCql,
      'krishi-dss:india_villages': villageCql
    };
  
    // visibility rules default
    const visibilityMap: { [k: string]: string[] } = {
      'village': ['krishi-dss:india_villages'],
      'taluka': ['krishi-dss:india_taluka', 'krishi-dss:india_villages'],
      'district': ['krishi-dss:india_district', 'krishi-dss:india_taluka'],
      'state': ['krishi-dss:india_states', 'krishi-dss:india_district']
    };
  
    const zIndexMap: any = {
      'krishi-dss:india_states': 104,
      'krishi-dss:india_district': 103,
      'krishi-dss:india_taluka': 102,
      'krishi-dss:india_villages': 101
    };
  
    // Add layers back
    this.boundaryLayers.forEach((bLayer: any) => {
      const layerName: string = bLayer.name;
  
      const params: any = {
        LAYERS: layerName,
        TRANSPARENT: true,
        FORMAT: 'image/png',
        TILED: true
      };
  
      // Apply CQL if present for that layer
      const cql = layerFilterMap[layerName];
      if (cql && cql.trim() !== '') {
        params.CQL_FILTER = cql;
      }
  
      const source = new ImageWMS({
        url: this.URL_WFS,
        params,
        serverType: 'geoserver',
        crossOrigin: 'anonymous'
      });
  
      // decide visibility combining selLevel and explicit CQL rules
      let visible = true;
  
      if (selLevel === 'lgd_d') {
        // selectedLevel override: show only district layer
        visible = layerName === 'krishi-dss:india_district';
      } else if (selLevel === 'lgd_t') {
        // selectedLevel override: show only taluka layer
        visible = layerName === 'krishi-dss:india_taluka';
      } else {
        // selLevel is null -> use explicit CQL-driven visibility rules
        if (villages && villages.length > 0) {
          // villages selected -> show only villages
          visible = layerName === 'krishi-dss:india_villages';
        } else if (talukas && talukas.length > 0) {
          // taluka selected (no villages) -> show villages inside those talukas only
          visible = layerName === 'krishi-dss:india_villages';
        } else if (districts && districts.length > 0) {
          // district selected (no taluka/village) -> show talukas inside those districts
          visible = layerName === 'krishi-dss:india_taluka';
        } else {
          // fallback to standard visibilityMap based on activeLevel
          if (activeLevel) {
            visible = (visibilityMap[activeLevel] || []).includes(layerName);
          } else {
            visible = !!bLayer.visible; // fallback to configured visible flag
          }
        }
      }
  
      const layer = new ImageLayer({
        source,
        visible
      });
  
      layer.set('boundryLayer', layerName);
      layer.setZIndex(zIndexMap[layerName] || 100);
      this.map.addLayer(layer);
      // this.showOutPutData()
      bLayer.layer = layer;
    });
  }
  
  
  
  
  

  currentExtent: any
  selectedlayerNameForZoom :any = 'lgd_s'
  selectedlayerNameForCount :any = 'lgd_d'
  getFeaturesExtends(lgdCode: any) {
    let layerName = this.selectedlayerNameForZoom
    this.commanService.loaderSpinShow()
    this.commanService.getBoundingBox(layerName, lgdCode).subscribe(
      (response:any) => {
        this.commanService.loaderSpinHide()
        const sourceProjection = 'EPSG:4326';
        const targetProjection = 'EPSG:3857';
        const geoJson = response;
        let combinedExtent :any
        if(this.selectedlayerNameForZoom == 'lgd_v'){
           combinedExtent = geoJson.features[0].properties.bbox1;

        }else{
           combinedExtent = geoJson.features[0].properties.bbox;
        }


        combinedExtent = JSON.parse(combinedExtent);
        for (let i = 1; i < geoJson.features.length; i++) {
          const featureExtent = geoJson.features[i].properties.bbox;
          const parsedFeatureExtent = JSON.parse(featureExtent);
          combinedExtent.xmin = Math.min(combinedExtent.xmin, parsedFeatureExtent.xmin);
          combinedExtent.ymin = Math.min(combinedExtent.ymin, parsedFeatureExtent.ymin);
          combinedExtent.xmax = Math.max(combinedExtent.xmax, parsedFeatureExtent.xmax);
          combinedExtent.ymax = Math.max(combinedExtent.ymax, parsedFeatureExtent.ymax);
        }
        const extent = [
          combinedExtent.xmin,
          combinedExtent.ymin,
          combinedExtent.xmax,
          combinedExtent.ymax
        ];
        const transformedExtent = transformExtent(extent, sourceProjection, targetProjection);

        this.map.getView().fit(transformedExtent, { padding: [20, 50, 20, 50] });
        this.currentExtent = transformedExtent;


      },
      (error:any) => {
        this.commanService.loaderSpinHide()
      }
    );
  }




  
  highlightBoundaryLayer:any
    // Loads and styles the specified LGD boundary layer (villages/taluka/district/state) using WFS + CQL filter.
  displayHighlightedBoundary(code: any, layerName:any , leval:any) {
    this.commanService.loaderSpinShow();
  
    // Remove old highlight layer if exists
    if (this.highlightBoundaryLayer) {
      this.map.removeLayer(this.highlightBoundaryLayer);
    }
  
    // Create vector source from WFS or GeoJSON URL with filter for lgd_s
    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      url: (extent) => {
        return `${this.URL_WFS}?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsname=EPSG:3857&CQL_FILTER=${leval} IN (${code})`;
      },
      strategy: bboxStrategy // import or define bboxStrategy to load by extent if large data
    });
  
    // Define style with stroke + shadow
    const highlightStyle = new Style({
      stroke: new Stroke({
        color: 'black', // red boundary line
        width: 3,
      }),
      fill: new Fill({
        color: 'rgba(255, 0, 0, 0.1)', // translucent fill
      })
    });
  
    // If shadow effect needed, create two styles:
    // One with wide transparent stroke as shadow and one main stroke.
    const shadowStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.3)', // black translucent shadow
        width: 8,
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 0, 0.1)',
      })
    });
  
    // Add vector layer with combined style - can do by layering two vector layers or using style function
    this.highlightBoundaryLayer = new VectorLayer({
      source: vectorSource,
      style: function(feature, resolution) {
        return [shadowStyle, highlightStyle];
      }
    });
  
    this.highlightBoundaryLayer.setZIndex(9999); // top layer
    this.map.addLayer(this.highlightBoundaryLayer);
  
    this.commanService.loaderSpinHide();
  }



  // ================= Age Grouping =============================
  isAgeSelected: boolean = false;

ageGroups: any = [];

onAgeCheckboxChange() {
  if (this.isAgeSelected) {
    // show section → initialize with 1 group
    this.ageGroups = [{ from: null, to: null }];
  } else {
    // uncheck → reset everything
    this.ageGroups = [];
  }
}

// Add new age group
addAgeGroup() {
  this.ageGroups.push({ from: null, to: null });
  this.validateGroups();
}
applyEnabled = false;
validateGroups() {
  let hasValidGroup = false;

  for (let g of this.ageGroups) {
    const from = g.from;
    const to = g.to;

    const hasFrom = from !== null && from !== '' && from !== undefined;
    const hasTo = to !== null && to !== '' && to !== undefined;

    // ❌ Rule: if one filled and other empty
    if ((hasFrom && !hasTo) || (!hasFrom && hasTo)) {
      this.applyEnabled = false;
      return;
    }

    // skip empty groups
    if (!hasFrom && !hasTo) continue;

    const fromStr = String(from);
    const toStr = String(to);

    // ❌ NEW RULE: starts with 0 (invalid)
    if (fromStr.startsWith('0') || toStr.startsWith('0')) {
      this.applyEnabled = false;
      return;
    }

    const f = Number(from);
    const t = Number(to);

    // ❌ invalid number
    if (isNaN(f) || isNaN(t)) {
      this.applyEnabled = false;
      return;
    }

    // ❌ must be within 1..150
    if (f < 1 || f > 150 || t < 1 || t > 150) {
      this.applyEnabled = false;
      return;
    }

    // ❌ to > from
    if (t <= f) {
      this.applyEnabled = false;
      return;
    }

    // ✔ valid complete group exists
    hasValidGroup = true;
  }

  this.applyEnabled = hasValidGroup;
}


// Validation: From Age cannot be negative
applyAgeFilter(){
  console.log(this.ageGroups);
  
}


isIncomeSelected: boolean = false;
incomeOption:any =[
  {label:'0 - 50000' , value:'0 - 50000'},
  {label:'50000 - 150000' , value:'50000 - 150000'},
  {label:'150000 - 500000' , value:'150000 - 500000'},
  {label:'500000 - 1000000' , value:'500000 - 1000000'},
]
selectedIncomeList:any = []
onIncomeCheckboxChange(){
  this.selectedIncomeList = []
}
onSelectImcomes(){

}


maritalStatusOptionList:any = [
  {label:'Single', value:'Single'},
  {label:'Married', value:'Married'},
  {label:'Widowed', value:'Widowed'},
  {label:'Divorced', value:'Divorced'}
]
selectedMartialStatusList:any = []
onSelectMartialStatus(){

}

sampleData:any = [
  {
      "name": "AKOLA",
      "totalcount": 456563,
      "lgdcode": 466
  },
  {
      "name": "AKOLA",
      "totalcount": 1414563,
      "lgdcode": 467
  },
  {
      "name": "AMRAVATI",
      "totalcount": 2360788,
      "lgdcode": 468
  },
  {
      "name": "AMRAVATI",
      "totalcount": 56860788,
      "lgdcode": 469
  },
  {
      "name": "BEED",
      "totalcount": 2000113,
      "lgdcode": 470
  },
  {
      "name": "BEED",
      "totalcount": 2000113,
      "lgdcode": 471
  },
  {
      "name": "BEED",
      "totalcount": 2000113,
      "lgdcode": 472
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 473
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 474
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 475
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 476
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 477
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 478
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 479
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 480
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 481
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 482
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 483
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 484
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 485
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 486
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 487
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 488
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 489
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 490
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 491
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 492
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 493
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 494
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 495
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 496
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 497
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 498
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 499
  },
  {
      "name": "BEED",
      "totalcount": 20034513,
      "lgdcode": 500
  },
]
showOutPutData(){
 


}

countLabelLayer:any
boundaryClickListener:any
// add this field in your component class
clickedBoundaryDetails: any = null; // will hold clicked boundary's properties + totalcount

displayCountAndBoundary(sampleData: any[], layerName: string, leval: string) {
  if (!Array.isArray(sampleData) || !sampleData.length) return;

  // cleanup previous layers / listener
  try {
    if (this.countLabelLayer) { this.map.removeLayer(this.countLabelLayer); this.countLabelLayer = null; }
    if (Array.isArray(this.boundaryLayers) && this.boundaryLayers.length) {
      this.boundaryLayers.forEach(l => this.map.removeLayer(l));
    }
    this.boundaryLayers = [];

    if (this.boundaryClickListener) {
      this.map.un('singleclick', this.boundaryClickListener);
      this.boundaryClickListener = null;
    }
  } catch (e) {
    console.warn('cleanup error', e);
  }

  // show loader
  this.commanService.loaderSpinShow();

  // 1) filter valid items: remove null, trim, require numeric strings
  const validItems = sampleData.filter((it: any) => {
    if (!it) return false;
    if (it.lgdcode == null) return false;            // remove null
    const code = String(it.lgdcode).trim();
    if (code === '') return false;                   // remove empty
    if (!/^\d+$/.test(code)) return false;           // only numeric strings allowed
    return true;
  });

  if (!validItems.length) {
    this.commanService.loaderSpinHide();
    return;
  }

  // 2) build countMap (lgdcode string -> totalcount sum)
  const countMap: Record<string, number> = {};
  validItems.forEach((it: any) => {
    const key = String(it.lgdcode).trim();
    const val = Number(it.totalcount) || 0;
    countMap[key] = (countMap[key] || 0) + val;
  });

  // 3) create unique codes string for CQL IN(...)
  const uniqueCodes = Array.from(new Set(validItems.map((it: any) => String(it.lgdcode).trim())));
  const codesStr = uniqueCodes.join(',');

  // 4) create label layer (counts)
  const labelSource = new VectorSource();
  this.countLabelLayer = new VectorLayer({
    source: labelSource,
    declutter: true,
    zIndex: 9999
  });
  this.map.addLayer(this.countLabelLayer);

  // 5) create polygon layer (single WFS call)
  const vectorSource = new VectorSource({
    format: new GeoJSON(),
    url: () =>
      `${this.URL_WFS}?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}` +
      `&outputFormat=application/json&srsname=EPSG:3857&CQL_FILTER=${leval} IN (${codesStr})`
  });

  const polygonLayer = new VectorLayer({
    source: vectorSource,
    style: new Style({
      stroke: new Stroke({ color: 'black', width: 2 }),
      fill: new Fill({ color: 'transparent' })
    }),
    zIndex: 5000
  });
  this.map.addLayer(polygonLayer);
  this.boundaryLayers.push(polygonLayer);

  // 6) when features loaded: add labels and attach click handler that sets clickedBoundaryDetails (no overlay)
  vectorSource.on('featuresloadend', () => {
    try {
      const features: any[] = vectorSource.getFeatures() || [];
      labelSource.clear();

      features.forEach((feat: any) => {
        if (!feat) return;

        // find lgd code on feature using likely property names
        const propCandidates = [leval, 'lgdcode', 'LGD_CODE', 'lgd_s', 'lgd'];
        let codeVal: string | null = null;
        for (const p of propCandidates) {
          const v = feat.get ? feat.get(p) : undefined;
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            codeVal = String(v).trim();
            break;
          }
        }
        if (!codeVal && feat.getId) codeVal = String(feat.getId());

        const cnt = codeVal ? (countMap[codeVal] ?? countMap[String(Number(codeVal))]) : null;
        if (cnt === null || cnt === undefined) return;

        // compute label coordinate
        const geom = feat.getGeometry();
        let coord:any;
        if (geom && typeof geom.getInteriorPoint === 'function') {
          const ip = geom.getInteriorPoint();
          coord = ip && ip.getCoordinates ? ip.getCoordinates() : getCenter(geom.getExtent());
        } else if (geom) {
          coord = getCenter(geom.getExtent());
        } else {
          return;
        }

        // add label feature
        const label = new Feature({
          geometry: new Point(coord),
          lgdcode: codeVal,
          count: cnt
        });
        label.setStyle(new Style({
          text: new Text({
            text: String(cnt),
            font: 'bold 14px Arial',
            fill: new Fill({ color: '#111' }),
            stroke: new Stroke({ color: '#fff', width: 4 })
          })
        }));
        labelSource.addFeature(label);
      });

      // hide loader
      this.commanService.loaderSpinHide();

      // click handler: find polygon feature and set this.clickedBoundaryDetails
      this.boundaryClickListener = (evt: any) => {
        const pixel = evt.pixel;
        let clickedFeature: any = null;
        let clickedLayer: any = null;

        this.map.forEachFeatureAtPixel(pixel, (feature: any, layer: any) => {
          if (layer === polygonLayer) {
            clickedFeature = feature;
            clickedLayer = layer;
            return true;
          }
          return false;
        });

        if (!clickedFeature) {
          // clear previous details if clicked empty area
          this.clickedBoundaryDetails = null;
          return;
        }

        // collect properties (exclude geometry)
        const props = clickedFeature.getProperties ? { ...clickedFeature.getProperties() } : {};
        delete props.geometry;

        // detect lgdcode for lookup
        let featureLgd: string | null = null;
        for (const p of [leval, 'lgdcode', 'LGD_CODE', 'lgd_s', 'lgd']) {
          if (props[p] !== undefined && props[p] !== null && String(props[p]).trim() !== '') {
            featureLgd = String(props[p]).trim();
            break;
          }
        }
        if (!featureLgd && clickedFeature.getId) featureLgd = String(clickedFeature.getId());

        const totalcount = featureLgd ? (countMap[featureLgd] ?? countMap[String(Number(featureLgd))]) : null;

        // set component variable with details (no overlay UI)
        this.clickedBoundaryDetails = {
          lgd: featureLgd,
          totalcount: totalcount,
          properties: props
        };
        console.log(this.clickedBoundaryDetails);

        
        // You can now use this.clickedBoundaryDetails in template or console
        // e.g., console.log(this.clickedBoundaryDetails)
      };

      // attach click listener once
      this.map.on('singleclick', this.boundaryClickListener);

    } catch (err) {
      console.error('featuresloadend error', err);
      this.commanService.loaderSpinHide();
    }
  });

  vectorSource.on('featuresloaderror', (err:any) => {
    console.error('WFS load error', err);
    this.commanService.loaderSpinHide();
  });
}







}
