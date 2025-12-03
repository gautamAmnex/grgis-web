import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CommanService {
  loaderSpinShow() {
    const el = document.getElementById("nb-global-spinner");
    if (el) {
      el.style["display"] = "flex";
    }
  }
  loaderSpinHide() {
    const el = document.getElementById("nb-global-spinner");
    if (el) {
      el.style["display"] = "none";
    }
  }
  geoServerUrl_dss = "https://preprod-kdss.da.gov.in/geoserver/krishi-dss/wms";
  geoServerUrl = "http://10.130.3.25:8080/geoserver/GR/wms";
  getBoundingBox(layerName: any, lgd_s: any): Observable<any> {
    let areaName: any;
    let url = "";
    if (layerName === "lgd_s") {
      areaName = "india_states";
      url = `${this.geoServerUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=GR:${areaName}&CQL_FILTER=${layerName} IN (${lgd_s})&outputFormat=application/json&PropertyName=bbox`;
    } else if (layerName === "lgd_d") {
      areaName = "india_district";
      url = `${this.geoServerUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=GR:${areaName}&CQL_FILTER=${layerName} IN (${lgd_s})&outputFormat=application/json&PropertyName=bbox`;
    } else if (layerName === "lgd_t") {
      areaName = "india_taluka";
      url = `${this.geoServerUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=GR:${areaName}&CQL_FILTER=${layerName} IN (${lgd_s})&outputFormat=application/json&PropertyName=bbox`;
    } else if (layerName === "lgd_v") {
      areaName = "india_villages";

      url = `${this.geoServerUrl}?service=WFS&version=1.1.0&request=GetFeature&typeName=GR:${areaName}&CQL_FILTER=${layerName} IN (${lgd_s})&outputFormat=application/json&PropertyName=bbox1`;
    }

    return this.http.get(url);
  }

  tryParseJSON(jsonString: string) {
    try {
      if (jsonString.startsWith("data:")) {
        const jsonSubstring = jsonString.substring(jsonString.indexOf("{"));
        const jsonObject = JSON.parse(jsonSubstring);
        return jsonObject;
      } else {
        const jsonObject = JSON.parse(jsonString);
        return jsonObject;
      }
    } catch (error) {
      return null;
    }
  }
  PostReactiveHandler3(payload: any, url: string): Observable<any> {
    return new Observable((subscriber) => {
      const headers = new Headers();
      const isFormData = payload instanceof FormData;
      if (!isFormData) {
        headers.append("Content-Type", "application/json");
        headers.append("Accept", "application/json");
      } else {
        headers.append("Accept", "application/json");
      }

      const requestOptions: RequestInit = {
        method: "POST",
        headers,
        body: isFormData ? payload : JSON.stringify(payload),
      };

      fetch(url, requestOptions)
        .then((response: any) => {
          if (!response.ok) {
            if (response.status === 401) {
              this.loaderSpinHide();
            }
            return response.text().then((errorText: any) => {
              let errorMessage = `HTTP ${response.status}`;
              try {
                const parsed = this.tryParseJSON(errorText);
                if (parsed && parsed.error) {
                  errorMessage = parsed.error;
                } else {
                  const match = (errorText || "").match(/"([^"]+)"/);
                  if (match && match[1]) errorMessage = match[1];
                  else if (errorText) errorMessage = errorText;
                }
              } catch {}
              const errorObj = { error: errorMessage, success: false };
              subscriber.next(errorObj);
              subscriber.complete();
            });
          }

          // --- STREAM READING with typed destructuring ---
          const reader = response.body?.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";

          const readChunk = (): Promise<any> | void =>
            reader
              ?.read()
              .then((result: { done: boolean; value?: Uint8Array }) => {
                const { done, value } = result;

                if (done) {
                  if (buffer.trim().length > 0) {
                    const jsonData = this.tryParseJSON(buffer);
                    if (jsonData !== undefined && jsonData !== null) {
                      subscriber.next(jsonData);
                    }
                  }
                  subscriber.complete();
                  return;
                }

                // value may be undefined but typically is Uint8Array
                if (value && value.length) {
                  buffer += decoder.decode(value, { stream: true });
                }

                const parts = buffer.split("\n");
                buffer = parts.pop() || "";

                for (const part of parts) {
                  const jsonData = this.tryParseJSON(part);
                  if (jsonData !== undefined && jsonData !== null) {
                    subscriber.next(jsonData);
                  }
                }

                return readChunk();
              });

          return readChunk();
        })
        .catch((err: any) => {
          const errorObj = {
            error: "Network Error: Unable to connect to server",
            success: false,
          };
          subscriber.next(errorObj);
          subscriber.complete();
        });
    });
  }

  private baseUrl = "https://departmentmasterapitest.amnex.co.in/api";
  constructor(private http: HttpClient) {}

  // ===== Dashboard Api ==============
  getOrganizationDistricts(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/OrganizationStructure/GetOrganizationDistricts`
    );
  }

  getAllOrganizationTalukaByDistricts(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/OrganizationStructure/GetOrganizationTalukaByDistricts`
    );
  }
  getOrganizationTalukaByDistrictids(districtId: any): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/OrganizationStructure/GetOrganizationTalukaByDistricts?districtids=${districtId}`
    );
  }

  getOrganizationVillagesByTalukas(talukaId: any): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/OrganizationStructure/GetOrganizationVillagesByTalukas?talukaids=${talukaId}`
    );
  }

  getDTVCount(payload: any): Observable<any> {
    return this.http.post(
      `https://departmentmasterapi.amnex.co.in/api/OrganizationStructure/GetDTVCount`,
      payload
    );
  }

  getgisgoldenrecorddetail(id: any): Observable<any> {
    return this.http.get(
      `https://departmentmasterapi.amnex.co.in/api/GIS/Getgisgoldenrecorddetail?id=${id}`
    );
  }

  getgislistfilter(payload: any): Observable<any> {
    return this.http.post(
      `https://departmentmasterapi.amnex.co.in/api/GIS/Getgislistfilter`,
      payload
    );
  }

  getgisgoldenrecorddynamicgroup(payload: any): Observable<any> {
    return this.http.post(
      `https://departmentmasterapi.amnex.co.in/api/GIS/Getgisgoldenrecorddynamicgroup`,
      payload
    );
  }

  // =======================================
  pridictSingleImage(payload: any): Observable<any> {
    return this.http.post(
      `https://gr.amnex.co.in/ai-ml-service/pipeline/predict`,
      payload
    );
  }
  pridictsimilarityImage(payload: any): Observable<any> {
    return this.http.post(`http://10.11.0.35:12001/check_matching`, payload);
  }

  // pridictsZipImage(payload:any): Observable<any> {
  //   return this.PostReactiveHandler3(payload,`https://gr.amnex.co.in/ai-ml-service/pipeline/v1/process-zip`);
  // }
  // https://gr.amnex.co.in/ai-ml-service/pipeline/v2/preview?path
  pridictsZipImageNew(payload: any): Observable<any> {
    return this.PostReactiveHandler3(
      payload,
      `https://gr.amnex.co.in/ai-ml-service/pipeline/v3/process-zip`
    );
  }

  getAllData(payload: any): Observable<any> {
    let uuid_a = payload.uuid_a;
    let page = payload.page;
    let size = payload.size;
    return this.http.get(
      `https://gr.amnex.co.in/ai-ml-service/pipeline/v3/results?uuid_a=${uuid_a}&page=${page}&size=${size}`
    );
  }
  // http://localhost:9091/pipeline/v3/results?uuid_a=11603fa5-7d4e-4089-8c09-7cfabccd3e37&page=1&size=30

  // https://gr.amnex.co.in/ai-ml-service/pipeline/v2/preview?path=new-hakim%20-%20Copy.jpg&uuid_a=5f9c701a-4beb-473f-b434-dc979392556c

  // private baseUrl = 'https://departmentmasterapitest.amnex.co.in/api/OrganizationStructure'
  preview(payload: any): Observable<any> {
    return this.http.get(
      `https://gr.amnex.co.in/ai-ml-service/pipeline/v2/preview?path=${payload.fileName}&uuid_a=${payload.id}`
    );
  }
  getGTsldUrl(payload: any) {
    // return this.http.post<any>(${this.baseUrl}/portal/sldxml/get_sld_url, payload);
    // return this.http.post<any>(`https://preprod-krishidss.da.gov.in/krishi-dss-python/portal/sldxml/get_sld_url_gr`, payload);
    return this.http.post<any>(
      `https://gr.amnex.co.in/ai-ml-service/portal/sldxml/get_sld_url_gr`,
      payload
    );
  }
}
