# Observe your users map browsing

```
PUT _ingest/pipeline/add_center_and_zoom_fields
{
  "description": "Compute zoom and center for tile requests ",
  "processors": [
    {
      "script": {
        "source": "¨""
        String url = ctx.url.original;
        
        def urlParts = url.splitOnToken('/');
        def partsLen = urlParts.length;
        
        def z = Double.parseDouble(urlParts[partsLen-3]);
        def x = Double.parseDouble(urlParts[partsLen-2]);
        def y = Double.parseDouble(urlParts[partsLen-1]);
        
        def lat = (x/Math.pow(2,z)*360-180);
        def n = Math.PI-2*Math.PI*y/Math.pow(2,z);
        def lon = (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
        
        ctx['url.center'] = z;
        ctx['url.zoom'] = [lon, lat];
        """,
        "if": "ctx?.url?.original !== null",
        "ignore_failure": true
      }
    }
  ]
}
```


```
PUT _index_template/logs-nginx.access
{
  "priority": 200,
  "template": {
    "settings": {
      "index": {
        "default_pipeline": "logs-nginx.access-1.5.0"
      }
    },
    "mappings": {
      "_meta": {
        "package": {
          "name": "nginx"
        },
        "managed_by": "fleet",
        "managed": true
      }
    }
  },
  "index_patterns": [
    "logs-nginx.access-*"
  ],
  "data_stream": {
    "hidden": false,
    "allow_custom_routing": false
  },
  "composed_of": [
    "logs-nginx.access@package",
    "logs-nginx.access@custom",
    ".fleet_globals-1",
    ".fleet_agent_id_verification-1"
  ],
  "_meta": {
    "package": {
      "name": "nginx"
    },
    "managed_by": "fleet",
    "managed": true
  }
}
```

```java
if (doc['httpRequest.requestUrl.keyword'].size() > 0) {
  String url = doc['httpRequest.requestUrl.keyword'].value;
  if (url != null){ 
    int indexEnd= url.indexOf('.png') + url.indexOf('.pbf') + 1;
    if (indexEnd > 0){
      def urlParts = url.substring(0,indexEnd).splitOnToken('/');
      def partsLen = urlParts.length;
      try {
        def z = Double.parseDouble(urlParts[partsLen-3]);
        def x = Double.parseDouble(urlParts[partsLen-2]);
        def y = Double.parseDouble(urlParts[partsLen-1]);
        
        def lat = (x/Math.pow(2,z)*360-180);
        def n = Math.PI-2*Math.PI*y/Math.pow(2,z);
        def lon = (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
        emit(lon,lat);
      } catch (Exception e) {}
    }
  }
}
```


```java
if (doc['httpRequest.requestUrl.keyword'].size() > 0) {
  String url = doc['httpRequest.requestUrl.keyword'].value;
  if (url != null){ 
    int indexEnd= url.indexOf('.png') + url.indexOf('.pbf') + 1;
    if (indexEnd > 0){
      def urlParts = url.substring(0,indexEnd).splitOnToken('/');
      def partsLen = urlParts.length;
      try {
        def z = urlParts[partsLen-3];
        emit(Integer.parseInt(z));
      } catch (Exception e) {}
    }
  }
}
```