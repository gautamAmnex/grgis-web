import { Component, AfterViewInit, IterableDiffers , ElementRef, HostListener, ViewChild } from "@angular/core";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { transform, fromLonLat, transformExtent } from "ol/proj";
import { MultiSelectModule } from "primeng/multiselect";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { CommonModule } from "@angular/common";
import { CommanService } from "../../services/comman.service";
import ImageWMS from "ol/source/ImageWMS.js";
import ImageLayer from "ol/layer/Image.js";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import { Style, Fill, Stroke, Icon, Text } from "ol/style";
import { getCenter } from "ol/extent";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { TileWMS, Vector, ImageStatic } from "ol/source";
import { LazyLoadEvent } from 'primeng/api';
import { Table } from 'primeng/table';
@Component({
  selector: "app-report-dashboard",
  templateUrl: "./report-dashboard.component.html",
  styleUrl: "./report-dashboard.component.scss",
})
export class ReportDashboardComponent {
  constructor(private commanService: CommanService) {}
  @ViewChild('dt') table!: Table;
  selectedLevel: any;
  levelOptionList: any = [
    { name: "District", value: 1 },
    { name: "Taluka", value: 2 },
  ];

  domicileOptionList: any = [
    { name: "Yes", value: 1 },
    { name: "No", value: 0 },
  ];
  selectedDomicileOption: any;
  selectedDisabilityOption: any;

  onLevelSelect() {
    this.resetPanel(false);
    this.selectedDistrict = null;
    this.selectedTaluka = null;
    this.selectedVillage = null;
    this.cqlDistrict = [];
    this.cqlSubDistrict = [];
    this.cqlVillage = [];
    this.tableData = [];
    this.totalRecords = 0;
    this.selectedlayerNameForZoom = "lgd_s";
    this.getFeaturesExtends(27);

    let payload = {
      level: this.selectedLevel,
      filterdata: "",
    };
    this.commanService.loaderSpinShow();
    this.commanService.getDTVCount(payload).subscribe(
      (res: any) => {
        this.commanService.loaderSpinHide();
        if (payload.level == 1) {
          this.selectedlayerNameForCount = "lgd_d";
          this.displayCountAndBoundary(
            res,
            "GR:india_district",
            this.selectedlayerNameForCount,
            "lgdcode"
          );
        } else {
          this.selectedlayerNameForCount = "lgd_t";
          this.displayCountAndBoundary(
            res,
            "GR:india_taluka",
            this.selectedlayerNameForCount,
            "lgdcode"
          );
        }
      },
      (error) => {
        this.commanService.loaderSpinHide();
      }
    );

    this.displayBoundryLayer();
  }
  setDefaultView() {
    this.selectedLevel = 1;
    this.selectedDistrict = null;
    this.selectedTaluka = null;
    this.selectedVillage = null;
    this.cqlDistrict = [];
    this.cqlSubDistrict = [];
    this.cqlVillage = [];
    this.tableData = [];
    this.totalRecords = 0;
    this.displayBoundryLayer();
    this.onLevelSelect();
  }
  ngOnInit() {}

  map!: Map;

  ngAfterViewInit(): void {
    this.initmap();
    this.getAllAreaDropDownList();
  }

  view: any;
  initmap() {
    this.view = new View({
      center: fromLonLat([78.781414, 22.164514]),
      zoom: 5,
    });
    const satelliteSource = new XYZ({
      url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    });
    const satelliteLayer = new TileLayer({
      source: satelliteSource,
      // visible:false
    });

    const indiaExtent: any = [68.7, 6.5, 97.4, 35.5];
    const centerX = (indiaExtent[0] + indiaExtent[2]) / 2;
    const centerY = (indiaExtent[1] + indiaExtent[3]) / 2;
    const center = [centerX, centerY];
    const transformedCenter = transform(center, "EPSG:4326", "EPSG:3857");
    this.map = new Map({
      target: "map",
      layers: [satelliteLayer],
      view: this.view,
    });
    this.map.on("singleclick", (event: any) => {
      const viewResolution = this.view.getResolution();

      // 🔥 Only get visible boundary layer
      const visibleLayer = this.getActiveVisibleBoundaryLayer();

      if (!visibleLayer) {
        console.warn("No visible boundary layer found.");
        return;
      }

      const source = visibleLayer.getSource();

      const url = source.getFeatureInfoUrl(
        event.coordinate,
        viewResolution,
        "EPSG:3857",
        { INFO_FORMAT: "application/json" }
      );

      if (!url) return;

      fetch(url)
        .then((res: any) => res.json())
        .then((data: any) => {
          if (!data.features?.length) return;

          const props = data.features[0].properties;
          console.log(props);

          // 🔥 Now no mismatch - only valid level returned
          if (props?.lgd_v) {
            this.displayHighlightedBoundary(
              props.lgd_v,
              "GR:india_villages",
              "lgd_v"
            );
          } else if (props?.lgd_t) {
            this.displayHighlightedBoundary(
              props.lgd_t,
              "GR:india_taluka",
              "lgd_t"
            );
          } else if (props?.lgd_d) {
            this.displayHighlightedBoundary(
              props.lgd_d,
              "GR:india_district",
              "lgd_d"
            );
          } else if (props?.lgd_s) {
            this.displayHighlightedBoundary(
              props.lgd_s,
              "GR:india_states",
              "lgd_s"
            );
          }
        })
        .catch((err: any) => console.error("Feature Info Error", err));
    });

    this.setDefaultView();
  }
  // Returns the appropriate ImageWMS source based on current zoom level from available boundary layers.

  getActiveVisibleBoundaryLayer() {
    if (!this.boundaryLayers || this.boundaryLayers.length === 0) return null;

    for (const bLayer of this.boundaryLayers) {
      if (bLayer.layer && bLayer.layer.getVisible()) {
        return bLayer.layer; // Return first visible boundary layer
      }
    }
    return null;
  }

  districtList: any = [];
  talukaList: any = [];
  villageList: any = [];

  getAllAreaDropDownList() {
    this.commanService.getOrganizationDistricts().subscribe((response: any) => {
      this.districtList = response;
    });
    this.commanService
      .getAllOrganizationTalukaByDistricts()
      .subscribe((response: any) => {
        this.talukaList = response;
      });
  }

  selectedDistrict: any;
  selectedTaluka: any;
  selectedVillage: any;

  getTalukaListByDistrictId() {
    this.tableData = [];
    this.totalRecords = 0;
    this.selectedLevel = null;
    this.selectedTaluka = null;
    this.talukaList = [];
    this.selectedVillage = null;
    this.villageList = [];
    this.cqlSubDistrict = [];
    this.cqlVillage = [];
    if (this.selectedDistrict) {
      this.commanService
        .getOrganizationTalukaByDistrictids(this.selectedDistrict.id)
        .subscribe((response: any) => {
          this.talukaList = response;
        });
   
    }
  
  
  }

  getVillageListByTalukaId() {
    this.tableData = [];
    this.totalRecords = 0;
    this.selectedLevel = null;
    this.selectedVillage = null;
    this.villageList = [];
    this.cqlVillage = [];
    if (this.selectedTaluka) {
      this.commanService
        .getOrganizationVillagesByTalukas(this.selectedTaluka.id)
        .subscribe((response: any) => {
          this.villageList = response;
        });
   
    } else {
      this.cqlSubDistrict = [];
      this.displayBoundryLayer();
      this.selectedlayerNameForZoom = "lgd_d";
      this.getFeaturesExtends(this.selectedDistrict.lgdcode);
      this.getgisgoldenrecorddynamicgroup();
    }
  }

  onVillageSelect() {
    this.tableData = [];
    this.totalRecords = 0;
    this.selectedLevel = null;
    if (this.selectedVillage) {
      this.cqlVillage = [this.selectedVillage.lgdcode];
      this.displayBoundryLayer();
      this.selectedlayerNameForZoom = "lgd_v";
      this.getFeaturesExtends(this.selectedVillage.lgdcode);
      this.getgisgoldenrecorddynamicgroup();
    } else {
      this.cqlVillage = [];
      this.displayBoundryLayer();
      this.selectedlayerNameForZoom = "lgd_t";
      this.getFeaturesExtends(this.selectedTaluka.lgdcode);
      this.getgisgoldenrecorddynamicgroup();
    }
  }

  checkboxItems = [
    { label: "AAY", checked: false, value: "aay" },
    { label: "PHH", checked: false, value: "phh" },
    { label: "APL White", checked: false, value: "apl white" },
    { label: "NA", checked: false, value: "na" },
  ];

  getSelectedrationCardCheckboxString() {
    return this.checkboxItems
      .filter((item) => item.checked)
      .map((item) => item.value)
      .join(",");
  }

  genderCheckboxes = [
    { label: "Male", checked: false, value: "male" },
    { label: "Female", checked: false, value: "female" },
    { label: "Transgender", checked: false, value: "transgender" },
    { label: "NA", checked: false, value: "na" },
  ];

  getSelectedGenderString() {
    return this.genderCheckboxes
      .filter((x) => x.checked)
      .map((x) => x.value)
      .join(",");
  }

  resetPanel(callFlag:any) {
   
    this.ageGroups = [];
    this.selectedDomicileOption = null;
    this.selectedDisabilityOption = null;
    this.isAgeSelected = false;
    this.selectedRationCardList = [];
    this.selectedGenderList = [];
    this.isIncomeSelected = false;
    this.isIncomeSelected = false;

    if(callFlag && (!this.selectedDistrict || !this.selectedTaluka)){
      this.setDefaultView();
    }
    else
     if(callFlag){
      this.getgisgoldenrecorddynamicgroupWithFilter()
    }
  }
  clearAreaWiseFilter(){
    this.setDefaultView();
  }

  applyAreaWiseFilter(){
    
     if (this.selectedTaluka){
      this.cqlSubDistrict = [this.selectedTaluka.lgdcode];
      this.displayBoundryLayer();
      this.selectedlayerNameForZoom = "lgd_t";
      this.getFeaturesExtends(this.selectedTaluka.lgdcode);
      this.getgisgoldenrecorddynamicgroup();
    }
    else if (this.selectedDistrict){
      this.cqlDistrict = [this.selectedDistrict.lgdcode];
      this.displayBoundryLayer();
      this.selectedlayerNameForZoom = "lgd_d";
      this.getFeaturesExtends(this.selectedDistrict.lgdcode);
      this.getgisgoldenrecorddynamicgroup();
    }
    else {
      this.cqlDistrict = [];
      this.setDefaultView();
      this.getgisgoldenrecorddynamicgroup();
    }
  }

  // Selection from dropdown
  getgisgoldenrecorddynamicgroup() {
    this.legendList = []
    this.tableData = [];
    this.totalRecords = 0;
    if (this.highlightBoundaryLayer) {
      this.map.removeLayer(this.highlightBoundaryLayer);
    }
    if (this.countLabelLayer) {
      this.map.removeLayer(this.countLabelLayer);
      this.countLabelLayer = null;
    }

    const payload: any = {
      groupby: "",
      district: "",
      taluka: "",
      village: "",
      gender: "",
      rationcardtype: "",
      domicileflag: "",
      disabilityflag: "",
      age: "",
      maritalstatus: "",
      income: "",
    };

    // READ SELECTED VALUES
    const selDistrict = this.selectedDistrict?.lgdcode ?? null;
    const selTaluka = this.selectedTaluka?.lgdcode ?? null;
    const selVillage = this.selectedVillage?.lgdcode ?? null;

    // LOCATION SELECTION LOGIC
    if (selDistrict && selTaluka && selVillage) {
      payload.village = String(selVillage);
    } else if (selDistrict && selTaluka) {
      payload.taluka = String(selTaluka);
    } else if (selDistrict) {
      payload.district = String(selDistrict);
    }

    // OTHER FILTERS
    payload.rationcardtype = this.selectedRationCardList
    ? this.selectedRationCardList.join(",")
    : "";
    payload.gender = this.selectedGenderList
    ? this.selectedGenderList.join(",")
    : "";

    if (this.selectedDomicileOption || this.selectedDomicileOption === 0)
      payload.domicileflag = String(this.selectedDomicileOption);

    if (this.selectedDisabilityOption || this.selectedDisabilityOption === 0)
      payload.disabilityflag = String(this.selectedDisabilityOption);

    payload.age = this.makeRangeString(this.ageGroups);
    // payload.maritalstatus = this.makeCommaString(
    //   this.selectedGenderList
    // );
    // payload.income = this.selectedRationCardList
    //   ? this.selectedRationCardList.join(",")
    //   : "";

    // BEGIN GROUPBY BUILDING
    const groupParts: string[] = [];

    // ----------------------------------------
    // 1️⃣ DISTRICT / TALUKA / VILLAGE MAPPING
    // ----------------------------------------
    const keys = Object.keys(payload);

    for (const k of keys) {
      if (k === "groupby") continue;
      const val = payload[k];
      if (!val || String(val).trim() === "") continue;

      if (k === "district") {
        groupParts.push("district", "districtcode", "taluka", "talukacode");
        continue;
      }
      if (k === "taluka") {
        groupParts.push("taluka", "talukacode", "village", "villagecode");
        continue;
      }
      if (k === "village") {
        groupParts.push("village", "villagecode");
        continue;
      }
    }

    // ----------------------------------------
    // 2️⃣ APPLY EXCHANGE KEY MAPPING
    // ----------------------------------------
    const exchangeMap = [
      { key: "rationcardtype", exchangeKey: "ration_card_type" },
      { key: "domicileflag", exchangeKey: "domicile_flag" },
      { key: "disabilityflag", exchangeKey: "disability_flag" },
      { key: "age", exchangeKey: "age_local" },
      { key: "maritalstatus", exchangeKey: "marital_status" },
      { key: "income", exchangeKey: "individual_annual_income" },
    ];

    exchangeMap.forEach((m) => {
      const val = payload[m.key];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        groupParts.push(m.exchangeKey);
      }
    });

    // ✨ Remove duplicates
    const finalParts = [...new Set(groupParts)];

    // FINAL JOIN
    payload.groupby = finalParts.join(",");

    console.log("FINAL PAYLOAD:", payload);

    // ----------------------------------------
    // 3️⃣ API CALL
    // ----------------------------------------
    this.commanService.loaderSpinShow()
    this.commanService.getgisgoldenrecorddynamicgroup(payload)
      .subscribe((res: any) => {
      
        const response = JSON.parse(
          res.data[0].fn_get_gis_golden_record_dynamic_group_v1
        );
        if (!response) {
          this.tableData = [];
          this.totalRecords = 0;
          if (this.highlightBoundaryLayer) {
            this.map.removeLayer(this.highlightBoundaryLayer);
          }
          if (this.countLabelLayer) {
            this.map.removeLayer(this.countLabelLayer);
            this.countLabelLayer = null;
          }
        
          this.commanService.loaderSpinHide()
          return;
        }

        // ----------------------------------------
        // 4️⃣ DISPLAY LAYER
        // ----------------------------------------
        if (payload.district !== "") {
          this.selectedlayerNameForCount = "lgd_t";
          this.displayCountAndBoundary(
            response,
            "GR:india_taluka",
            "lgd_t",
            "talukacode"
          );
        } else if (payload.taluka !== "") {
          this.selectedlayerNameForCount = "lgd_v";
          this.displayCountAndBoundary(
            response,
            "GR:india_villages",
            "lgd_v",
            "villagecode"
          );
        } else if (payload.village !== "") {
          this.selectedlayerNameForCount = "lgd_v";
          this.displayCountAndBoundary(
            response,
            "GR:india_villages",
            "lgd_v",
            "villagecode"
          );
        } else {
          // fallback
          this.selectedlayerNameForCount = "lgd_d";
          this.displayCountAndBoundary(
            response,
            "GR:india_district",
            "lgd_d",
            "districtcode"
          );
        }
      },
      (error:any)=>{
        this.commanService.loaderSpinHide()
      }
      );
  }

  // selection from filter panel
  getgisgoldenrecorddynamicgroupWithFilter() {
    this.tableData = [];
    this.totalRecords = 0;
    this.legendList = []
    if (this.highlightBoundaryLayer) {
      this.map.removeLayer(this.highlightBoundaryLayer);
    }
    if (this.countLabelLayer) {
      this.map.removeLayer(this.countLabelLayer);
      this.countLabelLayer = null;
    }

    const payload: any = {
      groupby: "",
      district: "",
      taluka: "",
      village: "",
      gender: "",
      rationcardtype: "",
      domicileflag: "",
      disabilityflag: "",
      age: "",
      maritalstatus: "",
      income: "",
    };

    // READ SELECTED VALUES
    const selDistrict = this.selectedDistrict?.lgdcode ?? null;
    const selTaluka = this.selectedTaluka?.lgdcode ?? null;
    const selVillage = this.selectedVillage?.lgdcode ?? null;

    // -----------------------------------------
    // 1️⃣ LOCATION SELECTION LOGIC
    // -----------------------------------------
    if (selDistrict && selTaluka && selVillage) {
      payload.village = String(selVillage);
    } else if (selDistrict && selTaluka) {
      payload.taluka = String(selTaluka);
    } else if (selDistrict) {
      payload.district = String(selDistrict);
    }

    // -----------------------------------------
    // 2️⃣ FILTER VALUES
    // -----------------------------------------
    payload.rationcardtype = this.selectedRationCardList
    ? this.selectedRationCardList.join(",")
    : "";
    payload.gender = this.selectedGenderList
    ? this.selectedGenderList.join(",")
    : "";

    if (this.selectedDomicileOption || this.selectedDomicileOption === 0)
      payload.domicileflag = String(this.selectedDomicileOption);

    if (this.selectedDisabilityOption || this.selectedDisabilityOption === 0)
      payload.disabilityflag = String(this.selectedDisabilityOption);

    payload.age = this.makeRangeString(this.ageGroups);
    // payload.maritalstatus = this.makeCommaString(
    //   this.selectedGenderList
    // );
    // payload.income = this.selectedRationCardList
    //   ? this.selectedRationCardList.join(",")
    //   : "";

    // -----------------------------------------
    // 3️⃣ BUILD GROUPBY (Dynamic)
    // -----------------------------------------
    const groupParts: string[] = [];

    // LOCATION KEYS
    for (const key of Object.keys(payload)) {
      if (key === "groupby") continue;
      const val = payload[key];
      if (!val || String(val).trim() === "") continue;

      if (key === "district") {
        groupParts.push("district", "districtcode", "taluka", "talukacode");
        continue;
      }
      if (key === "taluka") {
        groupParts.push("taluka", "talukacode", "village", "villagecode");
        continue;
      }
      if (key === "village") {
        groupParts.push("village", "villagecode");
        continue;
      }

      // Add gender normally (not part of special mapping)
      if (key === "gender") {
        groupParts.push("gender");
      }
    }

    // -----------------------------------------
    // 4️⃣ APPLY YOUR SPECIAL MAPPING RULES
    // -----------------------------------------
    const exchangeMap = [
      { key: "rationcardtype", exchangeKey: "ration_card_type" },
      { key: "domicileflag", exchangeKey: "domicile_flag" },
      { key: "disabilityflag", exchangeKey: "disability_flag" },
      { key: "age", exchangeKey: "age_local" },
      { key: "maritalstatus", exchangeKey: "marital_status" },
      { key: "income", exchangeKey: "individual_annual_income" },
    ];

    exchangeMap.forEach((m) => {
      const v = payload[m.key];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        groupParts.push(m.exchangeKey);
      }
    });

    // -----------------------------------------
    // 5️⃣ DEFAULT GROUPBY (WHEN NOTHING SELECTED)
    // -----------------------------------------
    if (!selDistrict && !selTaluka && !selVillage) {
      if (this.selectedLevel == 1) {
        groupParts.push("district", "districtcode");
      } else if (this.selectedLevel == 2) {
        groupParts.push("taluka", "talukacode");
      }
    }

    // REMOVE DUPLICATES
    const finalParts = [...new Set(groupParts)];

    payload.groupby = finalParts.join(",");

    console.log("FINAL PAYLOAD:", payload);

    // -----------------------------------------
    // 6️⃣ API CALL
    // -----------------------------------------
    this.commanService.loaderSpinShow()
    this.commanService
      .getgisgoldenrecorddynamicgroup(payload)
      .subscribe((res: any) => {
        const response = JSON.parse(
          res.data[0].fn_get_gis_golden_record_dynamic_group_v1
        );
        console.log(response);

        if (!response) {
          this.tableData = [];
          this.totalRecords = 0;
          if (this.highlightBoundaryLayer) {
            this.map.removeLayer(this.highlightBoundaryLayer);
          }
          if (this.countLabelLayer) {
            this.map.removeLayer(this.countLabelLayer);
            this.countLabelLayer = null;
          }
          this.commanService.loaderSpinHide()
          return;
        }

        // ---------------------------------------
        // 7️⃣ LAYER LOGIC
        // ---------------------------------------
        let layer = "";
        let lgdField = "";

        switch (true) {
          case !!this.selectedVillage:
            layer = "GR:india_villages";
            lgdField = "villagecode";
            this.selectedlayerNameForCount = "lgd_v";
            break;

          case !!this.selectedTaluka:
            layer = "GR:india_villages";
            lgdField = "villagecode";
            this.selectedlayerNameForCount = "lgd_v";
            break;

          case !!this.selectedDistrict:
            layer = "GR:india_taluka";
            lgdField = "talukacode";
            this.selectedlayerNameForCount = "lgd_t";
            break;

          default:
            if (this.selectedLevel == 1) {
              layer = "GR:india_district";
              lgdField = "districtcode";
              this.selectedlayerNameForCount = "lgd_d";
            } else {
              layer = "GR:india_taluka";
              lgdField = "talukacode";
              this.selectedlayerNameForCount = "lgd_t";
            }
            break;
        }

        this.displayCountAndBoundary(
          response,
          layer,
          this.selectedlayerNameForCount,
          lgdField
        );
      },
      (error:any)=>{
        this.commanService.loaderSpinHide()
      }
      );
  }

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLElement>;
  fullScreenMapEnable = false;

  toggleFullScreen() {
    const elem = this.mapContainer.nativeElement;

    if (!this.fullScreenMapEnable) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
      this.fullScreenMapEnable = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      this.fullScreenMapEnable = false;
    }
  }

  boundaryLayers: any = [
    { name: "GR:india_states", layer: null, visible: true },
    { name: "GR:india_district", layer: null, visible: true },
    { name: "GR:india_taluka", layer: null, visible: true },
    { name: "GR:india_villages", layer: null, visible: true },
  ];

  URL_WFS: any = this.commanService.geoServerUrl;
  URL_WFS_dss: any = this.commanService.geoServerUrl_dss;

  cqlState: any = [27];
  cqlDistrict: any = [];
  cqlSubDistrict: any = [];
  cqlVillage: any = [];
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

    const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

    // local copies
    const villages = toArray(this.cqlVillage);
    const talukas = toArray(this.cqlSubDistrict);
    const districts = toArray(this.cqlDistrict);
    const states = toArray(this.cqlState);

    // If any explicit CQL selection exists, we must clear selectedLevel (per requirement)
    if (
      (districts && districts.length > 0) ||
      (talukas && talukas.length > 0) ||
      (villages && villages.length > 0)
    ) {
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
    let activeLevel: "village" | "taluka" | "district" | "state" | null = null;

    // Special branch: when selectedLevel exists (lgd_d/lgd_t) -> follow that
    if (selLevel === 1) {
      activeLevel = "district";
    } else if (selLevel === 2) {
      activeLevel = "taluka";
    } else {
      // selectedLevel is null -> check explicit CQL arrays with your new rules:
      if (villages && villages.length > 0) {
        // highest priority: village present -> show that village only
        activeLevel = "village";
      } else if (talukas && talukas.length > 0) {
        // taluka present but no village -> show villages inside these talukas (special)
        activeLevel = "village";
      } else if (districts && districts.length > 0) {
        // district present but no taluka/village -> show talukas inside these districts (special)
        activeLevel = "taluka";
      } else if (states && states.length > 0) {
        // **CHANGE HERE**:
        // When only states are provided (no lower level CQL), show DISTRICTS of those states (not the state boundary).
        // So we set activeLevel to 'district' and will apply districtCql = lgd_s IN (...)
        activeLevel = "district";
      } else {
        activeLevel = null;
      }
    }

    // Format values for CQL (quote strings if needed)
    const formatValues = (arr: any[]) => {
      if (!arr || arr.length === 0) return "";
      const isString = typeof arr[0] === "string";
      return arr.map((v) => (isString ? `'${v}'` : v)).join(",");
    };

    // Prepare CQL filters
    let stateCql = "";
    let districtCql = "";
    let talukaCql = "";
    let villageCql = "";
    let lgdCode: any = null;

    // Handle cases

    if (selLevel === 1) {
      // show districts of selected states (only district layer)
      const vals = formatValues(states);
      districtCql = vals ? `lgd_s IN (${vals})` : "";
      lgdCode = states[0] ?? null;
      this.selectedlayerNameForZoom = "lgd_s";
      this.selectedlayerNameForCount = "lgd_d";
    } else if (selLevel === 2) {
      // show talukas of selected states (only taluka layer)
      const vals = formatValues(states);
      talukaCql = vals ? `lgd_s IN (${vals})` : "";
      lgdCode = states[0] ?? null;
      this.selectedlayerNameForZoom = "lgd_s";
      this.selectedlayerNameForCount = "lgd_d";
    } else {
      // selectedLevel is null -> apply CQL according to explicit arrays and new rules

      // Case A: villages explicitly selected -> show only those villages
      if (villages && villages.length > 0) {
        const vals = formatValues(villages);
        villageCql = vals ? `lgd_v IN (${vals})` : "";
        lgdCode = villages[0];
        this.selectedlayerNameForZoom = "lgd_v";
        this.selectedlayerNameForCount = "lgd_v";
        // visibility will be villages only (handled below)
      }
      // Case B: talukas explicitly selected (but no villages) -> show villages inside those talukas
      else if (talukas && talukas.length > 0) {
        const vals = formatValues(talukas);
        // We want to show villages inside selected talukas, so set villageCql by lgd_t
        villageCql = vals ? `lgd_t IN (${vals})` : "";
        lgdCode = talukas[0];
        // mark selectedlayerNameForZoom as taluka because selection came from taluka
        this.selectedlayerNameForZoom = "lgd_t";
        this.selectedlayerNameForCount = "lgd_v";
        // visibility will be villages only (handled below)
      }
      // Case C: districts explicitly selected (but no taluka/village) -> show talukas inside those districts
      else if (districts && districts.length > 0) {
        const vals = formatValues(districts);
        // show talukas inside these districts
        talukaCql = vals ? `lgd_d IN (${vals})` : "";
        lgdCode = districts[0];
        this.selectedlayerNameForZoom = "lgd_d";
        this.selectedlayerNameForCount = "lgd_t";
        // visibility will be talukas only (handled below)
      }
      // Case D: states provided only (no districts/talukas/villages) -> show districts of those states
      else if (states && states.length > 0) {
        const vals = formatValues(states);
        // NOTE: changed to set districtCql (lgd_s filter) instead of stateCql,
        // so we will display districts belonging to these states (not the state polygons).
        districtCql = vals ? `lgd_s IN (${vals})` : "";
        lgdCode = states[0] ?? null;
        this.selectedlayerNameForZoom = "lgd_s";
        this.selectedlayerNameForCount = "lgd_d";
        // activeLevel is already set to 'district' above
      }
      // Case E: fallback - nothing explicit
      else {
        // leave cql empty; activeLevel may be null
      }
    }

    // call existing helper
    this.getFeaturesExtends(lgdCode);

    // mapping layer name => which filter to apply (if any)
    const layerFilterMap: { [key: string]: string } = {
      "GR:india_states": stateCql,
      "GR:india_district": districtCql,
      "GR:india_taluka": talukaCql,
      "GR:india_villages": villageCql,
    };

    // visibility rules default
    const visibilityMap: { [k: string]: string[] } = {
      village: ["GR:india_villages"],
      taluka: ["GR:india_taluka", "GR:india_villages"],
      district: ["GR:india_district", "GR:india_taluka"],
      state: ["GR:india_states", "GR:india_district"],
    };

    const zIndexMap: any = {
      "GR:india_states": 104,
      "GR:india_district": 103,
      "GR:india_taluka": 102,
      "GR:india_villages": 101,
    };

    // Add layers back
    this.boundaryLayers.forEach((bLayer: any) => {
      const layerName: string = bLayer.name;

      const params: any = {
        LAYERS: layerName,
        TRANSPARENT: true,
        FORMAT: "image/png",
        TILED: true,
      };

      // Apply CQL if present for that layer
      const cql = layerFilterMap[layerName];
      if (cql && cql.trim() !== "") {
        params.CQL_FILTER = cql;
      }

      const source = new ImageWMS({
        url: this.URL_WFS,
        params,
        serverType: "geoserver",
        crossOrigin: "anonymous",
      });

      // decide visibility combining selLevel and explicit CQL rules
      let visible = true;

      if (selLevel === 1) {
        // selectedLevel override: show only district layer
        visible = layerName === "GR:india_district";
      } else if (selLevel === 2) {
        // selectedLevel override: show only taluka layer
        visible = layerName === "GR:india_taluka";
      } else {
        // selLevel is null -> use explicit CQL-driven visibility rules
        if (villages && villages.length > 0) {
          // villages selected -> show only villages
          visible = layerName === "GR:india_villages";
        } else if (talukas && talukas.length > 0) {
          // taluka selected (no villages) -> show villages inside those talukas only
          visible = layerName === "GR:india_villages";
        } else if (districts && districts.length > 0) {
          // district selected (no taluka/village) -> show talukas inside those districts
          visible = layerName === "GR:india_taluka";
        } else if (states && states.length > 0) {
          // IMPORTANT: when only states supplied, we want districts of those states (not state polygons),
          // so make only district layer visible
          visible = layerName === "GR:india_district";
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
        visible,
      });

      layer.set("boundryLayer", layerName);
      layer.setZIndex(zIndexMap[layerName] || 100);
      this.map.addLayer(layer);
      // this.showOutPutData()
      bLayer.layer = layer;
    });
  }

  currentExtent: any;
  selectedlayerNameForZoom: any = "lgd_s";
  selectedlayerNameForCount: any = "lgd_d";
  getFeaturesExtends(lgdCode: any) {
    let layerName = this.selectedlayerNameForZoom;
  
    this.commanService.getBoundingBox(layerName, lgdCode).subscribe(
      (response: any) => {
     
        const sourceProjection = "EPSG:4326";
        const targetProjection = "EPSG:3857";
        const geoJson = response;
        let combinedExtent: any;
        if (this.selectedlayerNameForZoom == "lgd_v") {
          combinedExtent = geoJson.features[0].properties.bbox1;
        } else {
          combinedExtent = geoJson.features[0].properties.bbox;
        }

        combinedExtent = JSON.parse(combinedExtent);
        for (let i = 1; i < geoJson.features.length; i++) {
          const featureExtent = geoJson.features[i].properties.bbox;
          const parsedFeatureExtent = JSON.parse(featureExtent);
          combinedExtent.xmin = Math.min(
            combinedExtent.xmin,
            parsedFeatureExtent.xmin
          );
          combinedExtent.ymin = Math.min(
            combinedExtent.ymin,
            parsedFeatureExtent.ymin
          );
          combinedExtent.xmax = Math.max(
            combinedExtent.xmax,
            parsedFeatureExtent.xmax
          );
          combinedExtent.ymax = Math.max(
            combinedExtent.ymax,
            parsedFeatureExtent.ymax
          );
        }
        const extent = [
          combinedExtent.xmin,
          combinedExtent.ymin,
          combinedExtent.xmax,
          combinedExtent.ymax,
        ];
        const transformedExtent = transformExtent(
          extent,
          sourceProjection,
          targetProjection
        );

        this.map
          .getView()
          .fit(transformedExtent, { padding: [20, 50, 20, 50] });
        this.currentExtent = transformedExtent;
      },
      (error: any) => {
     
      }
    );
  }

  highlightBoundaryLayer: any;
  // Loads and styles the specified LGD boundary layer (villages/taluka/district/state) using WFS + CQL filter.
  displayHighlightedBoundary(code: any, layerName: any, leval: any) {
    this.selectedCodeForTable = code
    this.selectedLevelForTable = leval
    this.commanService.loaderSpinShow();

    // Remove old highlight layer if exists
    if (this.highlightBoundaryLayer) {
      this.map.removeLayer(this.highlightBoundaryLayer);
    }
    let url = `${this.URL_WFS}?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsname=EPSG:3857&CQL_FILTER=${leval} IN (${code})`;

    if ("lgd_d" === leval) {
    }
    // let url =  `${this.URL_WFS}?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsname=EPSG:3857&CQL_FILTER=${leval} IN (${code})`
    // Create vector source from WFS or GeoJSON URL with filter for lgd_s
    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      url: (extent) => {
        return url;
      },
      strategy: bboxStrategy, // import or define bboxStrategy to load by extent if large data
    });

    // Define style with stroke + shadow
    const highlightStyle = new Style({
      stroke: new Stroke({
        color: "black", // red boundary line
        width: 3,
      }),
      fill: new Fill({
        color: "rgba(255, 0, 0, 0.1)", // translucent fill
      }),
    });

    // If shadow effect needed, create two styles:
    // One with wide transparent stroke as shadow and one main stroke.
    const shadowStyle = new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 0.3)", // black translucent shadow
        width: 8,
      }),
      fill: new Fill({
        color: "rgba(0, 0, 0, 0.1)",
      }),
    });

    // Add vector layer with combined style - can do by layering two vector layers or using style function
    this.highlightBoundaryLayer = new VectorLayer({
      source: vectorSource,
      style: function (feature, resolution) {
        return [shadowStyle, highlightStyle];
      },
    });

    this.highlightBoundaryLayer.setZIndex(9999); // top layer
    this.map.addLayer(this.highlightBoundaryLayer);

    this.commanService.loaderSpinHide();
    this.first = 0;
    this.rows = 50;
    this.table?.reset();
    this.getTableDetailByLgdCode(code, leval);
  }

  first: any = 0;
  rows: any = 50;
  selectedCodeForTable:any
  selectedLevelForTable:any
  tableFlag:boolean = true
  

  loadData(event: LazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 50;
  
    if (!this.tableFlag) {
      return;
    }
  
    this.getTableDetailByLgdCode(
      this.selectedCodeForTable,
      this.selectedLevelForTable
    );
  }

  tableData: any = [];
  totalRecords: any = 0;
  getTableDetailByLgdCode(code: any, leval: any) {
    this.tableFlag = false
    // this.tableData = [];
    // this.totalRecords = 0;
    const payload: any = {
      groupby: "",
      district: "",
      taluka: "",
      village: "",
      gender: "",
      rationcardtype: "",
      domicileflag: "",
      disabilityflag: "",
      age: "",
      maritalstatus: "",
      income: "",
      "page": String((this.first / this.rows) + 1) ,
      "size":String( this.rows),
    };

    if (leval == "lgd_d") {
      payload.district = String(code);
    } else if (leval == "lgd_t") {
      payload.taluka = String(code);
    } else if (leval == "lgd_v") {
      payload.village = String(code);
    }

    // -----------------------------------------
    // 2️⃣ FILTER VALUES
    // -----------------------------------------
    payload.rationcardtype = this.selectedRationCardList
    ? this.selectedRationCardList.join(",")
    : "";
    payload.gender = this.selectedGenderList
    ? this.selectedGenderList.join(",")
    : "";

    if (this.selectedDomicileOption || this.selectedDomicileOption === 0)
      payload.domicileflag = String(this.selectedDomicileOption);

    if (this.selectedDisabilityOption || this.selectedDisabilityOption === 0)
      payload.disabilityflag = String(this.selectedDisabilityOption);

    payload.age = this.makeRangeString(this.ageGroups);
    // payload.maritalstatus = this.makeCommaString(
    //   this.selectedGenderList
    // );
    // payload.income = this.selectedRationCardList
    //   ? this.selectedRationCardList.join(",")
    //   : "";

    // -----------------------------------------
    // 4️⃣ APPLY YOUR SPECIAL MAPPING RULES
    // -----------------------------------------
    const groupParts: string[] = [];
    const exchangeMap = [
      { key: "rationcardtype", exchangeKey: "ration_card_type" },
      { key: "domicileflag", exchangeKey: "domicile_flag" },
      { key: "disabilityflag", exchangeKey: "disability_flag" },
      { key: "age", exchangeKey: "age_local" },
      { key: "maritalstatus", exchangeKey: "marital_status" },
      { key: "income", exchangeKey: "individual_annual_income" },
    ];

    exchangeMap.forEach((m) => {
      const v = payload[m.key];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        groupParts.push(m.exchangeKey);
      }
    });
    const finalParts = [...new Set(groupParts)];

    payload.groupby = finalParts.join(",");
    this.commanService.loaderSpinShow();
    this.commanService.getgislistfilter(payload).subscribe(
      (res: any) => {
        // console.log(res.data[0].fn_getgislistfilterwise);
        this.commanService.loaderSpinHide();
        if(res.data[0].fn_get_gis_list_filter !== null){
          const data = JSON.parse(res.data[0].fn_get_gis_list_filter)
          console.log(JSON.parse(res.data[0].fn_get_gis_list_filter));
          
          this.tableData = data.data
          this.showTable = true
          this.totalRecords = data.totalCount
        }
        else{
          this.tableData = [];
          this.totalRecords = 0;
        }
        setTimeout(() => (this.tableFlag = true)); 
        
      },
      (error) => {
        this.tableData = [];
        this.totalRecords = 0;
        this.commanService.loaderSpinHide();
        setTimeout(() => (this.tableFlag = true));
      }
    );
  }

  showTable: boolean = false;
  showDetail: boolean = false;
  formattedList: any;
  getDetailById(uniqueKey: any) {
    this.commanService.loaderSpinShow();
    this.commanService.getgisgoldenrecorddetail(uniqueKey).subscribe(
      (res: any) => {
        this.commanService.loaderSpinHide();
        this.formattedList = this.formatData(JSON.parse(res.data));
        this.showDetail = true;
      },
      (error) => {
        this.showDetail = false;
        this.commanService.loaderSpinHide();
      }
    );
  }

  formatData(obj: any) {
    const result: any[] = [];

    Object.keys(obj).forEach((key: any) => {
      const value = obj[key];

      if (value === null || value === undefined || value === "") return;

      // format key: replace _ with space + capitalize first letter
      let formattedKey = key.replace(/_/g, " ");
      formattedKey =
        formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

      result.push({
        key: formattedKey,
        value: value,
      });
    });

    return result;
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

      const hasFrom = from !== null && from !== "" && from !== undefined;
      const hasTo = to !== null && to !== "" && to !== undefined;

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
      if (fromStr.startsWith("0") || toStr.startsWith("0")) {
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
  applyAgeFilter() {
    console.log(this.ageGroups);
  }
  makeRangeString(arr: any[]): string {
    if (!arr || !arr.length) return "";

    return arr
      .filter((item: any) => item.from != null && item.to != null) // remove invalid
      .map((item: any) => `${item.from}-${item.to}`)
      .join(","); // if multiple ranges present
  }
  makeCommaString(list: string[]): string {
    if (!list || !Array.isArray(list)) return "";
    return list.join(",");
  }

  isIncomeSelected: boolean = false;
  incomeOption: any = [
    { label: "0 - 50000", value: "0-50000" },
    { label: "50000 - 150000", value: "50000-150000" },
    { label: "150000 - 500000", value: "150000-500000" },
    { label: "500000 - 1000000", value: "500000-1000000" },
  ];
  selectedRationCardList: any = [];
  onIncomeCheckboxChange() {
    this.selectedRationCardList = [];
  }
  onSelectImcomes() {}

  maritalStatusOptionList: any = [
    { label: "Single", value: "single" },
    { label: "Married", value: "married" },
    { label: "Widowed", value: "widowed" },
    { label: "Divorced", value: "divorced" },
  ];
  selectedGenderList: any = [];
  onSelectMartialStatus() {}

  sampleData: any = [];
  showOutPutData() {}

  countLabelLayer: any;
  boundaryClickListener: any;
  // add this field in your component class
  clickedBoundaryDetails: any = null; // will hold clicked boundary's properties + totalcount
   buildThreeColorRanges(data: any) {
    const colors :any = ['#fed55b', '#3487b0', '#8cc2f3'];
  
    // extract numbers safely
    const counts = data
      .map((d:any) => Number(d.totalcount))
      .filter((n:any) => !isNaN(n));
  
    const min = Math.min(...counts);
    const max = Math.max(...counts);
  
    // equal spacing
    const interval = Math.floor((max - min) / 3);
  
    const r1_min = min;
    const r1_max = r1_min + interval;
  
    const r2_min = r1_max + 1;
    const r2_max = r2_min + interval;
  
    const r3_min = r2_max + 1;
    const r3_max = max;
  
    return [
      {
        range: [r1_min, r1_max],
        rangeLabel: `${r1_min} - ${r1_max}`,
        color: colors[0],
      },
      {
        range: [r2_min, r2_max],
        rangeLabel: `${r2_min} - ${r2_max}`,
        color: colors[1],
      },
      {
        range: [r3_min, r3_max],
        rangeLabel: `${r3_min} - ${r3_max}`,
        color: colors[2],
      },
    ];
  }

  legendList:any = []
  
  displayCountAndBoundary(
    sampleData: any[],
    layerName: string,
    leval: string,
    codeKey: any
  ) {
    console.log(sampleData);
    this.legendList = this.buildThreeColorRanges(sampleData)
    if (!Array.isArray(sampleData) || !sampleData.length) return;
    if (this.highlightBoundaryLayer) {
      this.map.removeLayer(this.highlightBoundaryLayer);
    }
    if (this.countLabelLayer) {
      this.map.removeLayer(this.countLabelLayer);
      this.countLabelLayer = null;
    }
    // cleanup previous layers / listener
    try {
      // if (Array.isArray(this.boundaryLayers) && this.boundaryLayers.length) {
      //   this.boundaryLayers.forEach((l :any)=> this.map.removeLayer(l));
      // }
      // this.boundaryLayers = [];

      if (this.boundaryClickListener) {
        this.map.un("singleclick", this.boundaryClickListener);
        this.boundaryClickListener = null;
      }
    } catch (e) {
      console.warn("cleanup error", e);
    }

    // show loader
    this.commanService.loaderSpinShow();

    // 1) filter valid items: remove null, trim, require numeric strings
    const validItems = sampleData.filter((it: any) => {
      if (!it) return false;
      if (it[codeKey] == null) return false; // remove null
      const code = String(it[codeKey]).trim();
      if (code === "") return false; // remove empty
      if (!/^\d+$/.test(code)) return false; // only numeric strings allowed
      return true;
    });

    if (!validItems.length) {
      this.commanService.loaderSpinHide();
      return;
    }

    // 2) build countMap [codeKey] string -> totalcount sum)
    const countMap: Record<string, number> = {};
    validItems.forEach((it: any) => {
      const key = String(it[codeKey]).trim();
      const val = Number(it.totalcount) || 0;
      countMap[key] = (countMap[key] || 0) + val;
    });

    // 3) create unique codes string for CQL IN(...)
    const uniqueCodes = Array.from(
      new Set(validItems.map((it: any) => String(it[codeKey]).trim()))
    );
    const codesStr = uniqueCodes.join(",");

    // 4) create label layer (counts)
    const labelSource = new VectorSource();
    this.countLabelLayer = new VectorLayer({
      source: labelSource,
      declutter: true,
      zIndex: 9999,
    });
    this.map.addLayer(this.countLabelLayer);
    console.log(sampleData);
    const countsObj = sampleData.reduce((acc, item) => {
      const code = Number(item[codeKey]);
      const cnt = Number(item.totalcount);

      acc[code] = (acc[code] || 0) + cnt;
      return acc;
    }, {});

    console.log(countsObj);

    let newLayerName: any;
    if (layerName === "GR:india_villages") {
      // newLayerName = "krishi-dss:india_villages";
      newLayerName = "GR:india_villages";
    }
    if (layerName === "GR:india_taluka") {
      // newLayerName = "krishi-dss:india_taluka";
      newLayerName = "GR:india_taluka";
    }
    if (layerName === "GR:india_district") {
      // newLayerName = "krishi-dss:india_district";
      newLayerName = "GR:india_district";
    }
    if (layerName === "GR:india_states") {
      // newLayerName = "krishi-dss:india_states";
      newLayerName = "GR:india_states";
    }
    const payload = {
      layer: newLayerName,
      attribute: leval,
      counts: countsObj,
    };

    this.setSldData(payload);
    return;

    // 5) create polygon layer (single WFS call)
    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      url: () =>
        `${this.URL_WFS}?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}` +
        `&outputFormat=application/json&srsname=EPSG:3857&CQL_FILTER=${leval} IN (${codesStr})`,
    });

    const polygonLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({ color: "black", width: 2 }),
        fill: new Fill({ color: "transparent" }),
      }),
      zIndex: 5000,
    });
    this.map.addLayer(polygonLayer);
    this.boundaryLayers.push(polygonLayer);

    // 6) when features loaded: add labels and attach click handler that sets clickedBoundaryDetails (no overlay)
    vectorSource.on("featuresloadend", () => {
      try {
        const features: any[] = vectorSource.getFeatures() || [];
        labelSource.clear();

        features.forEach((feat: any) => {
          if (!feat) return;

          // find lgd code on feature using likely property names
          const propCandidates = [
            leval,
            "lgdcode",
            "talukacode",
            "districtcode",
            "LGD_CODE",
            "lgd_s",
            "lgd",
          ];
          let codeVal: string | null = null;
          for (const p of propCandidates) {
            const v = feat.get ? feat.get(p) : undefined;
            if (v !== undefined && v !== null && String(v).trim() !== "") {
              codeVal = String(v).trim();
              break;
            }
          }
          if (!codeVal && feat.getId) codeVal = String(feat.getId());

          const cnt = codeVal
            ? countMap[codeVal] ?? countMap[String(Number(codeVal))]
            : null;
          if (cnt === null || cnt === undefined) return;

          // compute label coordinate
          const geom = feat.getGeometry();
          let coord: any;
          if (geom && typeof geom.getInteriorPoint === "function") {
            const ip = geom.getInteriorPoint();
            coord =
              ip && ip.getCoordinates
                ? ip.getCoordinates()
                : getCenter(geom.getExtent());
          } else if (geom) {
            coord = getCenter(geom.getExtent());
          } else {
            return;
          }

          // add label feature
          const label = new Feature({
            geometry: new Point(coord),
            lgdcode: codeVal,
            count: cnt,
          });
          label.setStyle(
            new Style({
              text: new Text({
                text: String(cnt),
                font: "bold 14px Arial",
                fill: new Fill({ color: "#111" }),
                stroke: new Stroke({ color: "#fff", width: 4 }),
              }),
            })
          );
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
          const props = clickedFeature.getProperties
            ? { ...clickedFeature.getProperties() }
            : {};
          delete props.geometry;

          // detect lgdcode for lookup
          let featureLgd: string | null = null;
          for (const p of [leval, "lgdcode", "LGD_CODE", "lgd_s", "lgd"]) {
            if (
              props[p] !== undefined &&
              props[p] !== null &&
              String(props[p]).trim() !== ""
            ) {
              featureLgd = String(props[p]).trim();
              break;
            }
          }
          if (!featureLgd && clickedFeature.getId)
            featureLgd = String(clickedFeature.getId());

          const totalcount = featureLgd
            ? countMap[featureLgd] ?? countMap[String(Number(featureLgd))]
            : null;

          // set component variable with details (no overlay UI)
          this.clickedBoundaryDetails = {
            lgd: featureLgd,
            totalcount: totalcount,
            properties: props,
          };

          console.log(this.clickedBoundaryDetails);
          if (this.clickedBoundaryDetails.properties?.lgd_v) {
            this.displayHighlightedBoundary(
              this.clickedBoundaryDetails.properties.lgd_v,
              "GR:india_villages",
              "lgd_v"
            );
          } else if (this.clickedBoundaryDetails.properties?.lgd_t) {
            this.displayHighlightedBoundary(
              this.clickedBoundaryDetails.properties.lgd_t,
              "GR:india_taluka",
              "lgd_t"
            );
          } else if (this.clickedBoundaryDetails.properties?.lgd_d) {
            this.displayHighlightedBoundary(
              this.clickedBoundaryDetails.properties.lgd_d,
              "GR:india_district",
              "lgd_d"
            );
          } else if (this.clickedBoundaryDetails.properties?.lgd_s) {
            this.displayHighlightedBoundary(
              this.clickedBoundaryDetails.properties.lgd_s,
              "GR:india_states",
              "lgd_s"
            );
          }

          // You can now use this.clickedBoundaryDetails in template or console
          // e.g., console.log(this.clickedBoundaryDetails)
        };

        // attach click listener once
        this.map.on("singleclick", this.boundaryClickListener);
      } catch (err) {
        console.error("featuresloadend error", err);
        this.commanService.loaderSpinHide();
      }
    });

    vectorSource.on("featuresloaderror", (err: any) => {
      console.error("WFS load error", err);
      this.commanService.loaderSpinHide();
    });
  }

  setSldData(payload: any) {
    // const countsObj: any = {};
    // codesArray.forEach((code, i) => {
    //   countsObj[code] = totalCountsArray[i];
    // });

    // const payload = {
    //   layer: layerName,
    //   attribute: leval,
    //   counts: countsObj,
    // };
    // console.log(payload);
    // this.setSldData(payload)
    console.log(payload);


    // this.sldArray[0]
    // this.addGtColorFillSldLayer("")
    this.commanService.getGTsldUrl(payload).subscribe(
      (res) => {
        this.commanService.loaderSpinHide();
        this.addGtColorFillSldLayer(res.file_url);
      },
      (error: any) => {
        console.error("Error fetching SLD URL:", error);

        this.commanService.loaderSpinHide();
      }
    );
  }

  sldLayerSource: any;
  addGtColorFillSldLayer(sld: any) {
    // Remove old SLD layer before adding new one
    if (this.countLabelLayer) {
      this.map.removeLayer(this.countLabelLayer);
      this.countLabelLayer = null;
      this.sldLayerSource = null;
    }

    this.sldLayerSource = new ImageWMS({
      url: this.URL_WFS,
      params: {
        TRANSPARENT: true,
        FORMAT: "image/png",
        TILED: false, // <-- make sure not tile labels
        SLD: `${sld}`,
        STYLES: undefined,
        VERSION: "1.1.0",
      },
      serverType: "geoserver",
      crossOrigin: "anonymous",
    });

    this.countLabelLayer = new ImageLayer({
      source: this.sldLayerSource,
    });

    this.countLabelLayer.set("layerType", "gtLayer");
    this.map.addLayer(this.countLabelLayer);

    this.displayBoundryLayer();
  }

  activeLayer: string = 'satellite';

  sateliteMapFlage = true;
  openStreet = false;
  terrainMapFlage = false;  
  deafaultLayer = false;
  hybridMapFlag = false
  // Changes the base map layer based on the input layer type.
  changeBaselayers(layer: any) {
    let url: any = null;
    let visible = true;
    if (layer === 'Terrain') {
      this.terrainMapFlage = true;
      this.sateliteMapFlage = false;
      this.hybridMapFlag = false;
      this.openStreet = false;
      this.deafaultLayer = false;
      url = 'https://mt1.google.com/vt/terrain=t&x={x}&y={y}&z={z}'
    }

    else if (layer === 'Satellite_hybrid') {
      this.terrainMapFlage = false;
      this.sateliteMapFlage = true;
      this.hybridMapFlag = false;
      this.openStreet = false;
      this.deafaultLayer = false;
      url = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
    }
    else if (layer === 'Open_Street') {
      this.terrainMapFlage = false;
      this.sateliteMapFlage = false;
      this.hybridMapFlag = false;
      this.openStreet = true;
      this.deafaultLayer = false;
      url = 'http://tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
    else if (layer === 'googleHybrid') {
     
      this.terrainMapFlage = false;
      this.sateliteMapFlage = false;
      this.hybridMapFlag = true;
      this.openStreet = false;
      this.deafaultLayer = false;
      url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
    }
    else if (layer === 'deafaultLayer') {
     
      visible = false;
    this.terrainMapFlage = false;
    this.sateliteMapFlage = false;
    this.hybridMapFlag = false;
    this.openStreet = false;
    this.deafaultLayer = true;
    url = 'http://tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
   
  
    const baseMap_layer = new TileLayer({
      source: new XYZ({
        url: url,
          // crossOrigin: 'anonymous',
      }),
      visible: visible,
    })
    // setTimeout(() => {
      this.map.getLayers().setAt(0, baseMap_layer);
    // }, 500);
    
    // this.map_new.addControl(this.overviewMapControlbase);
  }

  layers_toggle = false;
  // Toggles the display of the layer toggle button UI.
  toggle_layers(){
    this.layers_toggle = !this.layers_toggle;
  }

}
