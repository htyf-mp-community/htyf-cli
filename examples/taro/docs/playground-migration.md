# Playground 1.11.0 迁移清单

源：`/Users/dgz/Downloads/taro-playground-releases-v1.11.0/src`。目标沿用 `taro-playground` 中的 `_taro_temp_`，Taro 4.2.1 / HTYF 0.7.0。

业务与资源保存在 `src/playground`；首页及底部菜单与源 RN 配置一致，通过 HTYF Taro 路由管理。

## 页面清单（源码移植与路由注册，不代表真机验收）

- [x] `pages/home/index` → `playground/pages/home/index`
- [x] `pages/global/index` → `playground/pages/global/index`
- [x] `pages/global/pages/hooks/page` → `playground/pages/global/pages/hooks/page`
- [x] `pages/global/pages/lifecycle/page` → `playground/pages/global/pages/lifecycle/page`
- [x] `pages/global/pages/router/index` → `playground/pages/global/pages/router/index`
- [x] `pages/global/pages/styles/size` → `playground/pages/global/pages/styles/size`
- [x] `pages/global/pages/styles/platform` → `playground/pages/global/pages/styles/platform`
- [x] `pages/components/index` → `playground/pages/components/index`
- [x] `pages/components/pages/view/view` → `playground/pages/components/pages/view/view`
- [x] `pages/components/pages/scroll-view/scroll-view` → `playground/pages/components/pages/scroll-view/scroll-view`
- [x] `pages/components/pages/icon/icon` → `playground/pages/components/pages/icon/icon`
- [x] `pages/components/pages/progress/progress` → `playground/pages/components/pages/progress/progress`
- [x] `pages/components/pages/image/image` → `playground/pages/components/pages/image/image`
- [x] `pages/components/pages/camera/camera` → `playground/pages/components/pages/camera/camera`
- [x] `pages/components/pages/video/video` → `playground/pages/components/pages/video/video`
- [x] `pages/components/pages/swiper/swiper` → `playground/pages/components/pages/swiper/swiper`
- [x] `pages/components/pages/form/form` → `playground/pages/components/pages/form/form`
- [x] `pages/components/pages/input/input` → `playground/pages/components/pages/input/input`
- [x] `pages/components/pages/checkbox/checkbox` → `playground/pages/components/pages/checkbox/checkbox`
- [x] `pages/components/pages/radio/radio` → `playground/pages/components/pages/radio/radio`
- [x] `pages/components/pages/button/button` → `playground/pages/components/pages/button/button`
- [x] `pages/components/pages/text/text` → `playground/pages/components/pages/text/text`
- [x] `pages/components/pages/label/label` → `playground/pages/components/pages/label/label`
- [x] `pages/components/pages/page-container/page-container` → `playground/pages/components/pages/page-container/page-container`
- [x] `pages/components/pages/picker/picker` → `playground/pages/components/pages/picker/picker`
- [x] `pages/components/pages/picker-view/picker-view` → `playground/pages/components/pages/picker-view/picker-view`
- [x] `pages/components/pages/rich-text/rich-text` → `playground/pages/components/pages/rich-text/rich-text`
- [x] `pages/components/pages/slider/slider` → `playground/pages/components/pages/slider/slider`
- [x] `pages/components/pages/switch/switch` → `playground/pages/components/pages/switch/switch`
- [x] `pages/components/pages/textarea/textarea` → `playground/pages/components/pages/textarea/textarea`
- [x] `pages/components/pages/navigator/navigator` → `playground/pages/components/pages/navigator/navigator`
- [x] `pages/components/pages/virtual-list/virtual-list` → `playground/pages/components/pages/virtual-list/virtual-list`
- [x] `pages/components/pages/movable-view/movable-view` → `playground/pages/components/pages/movable-view/movable-view`
- [x] `pages/apis/index` → `playground/pages/apis/index`
- [x] `pages/apis/pages/basic/system/index` → `playground/pages/apis/pages/basic/system/index`
- [x] `pages/apis/pages/surface/interactive/index` → `playground/pages/apis/pages/surface/interactive/index`
- [x] `pages/apis/pages/surface/navigationBar/index` → `playground/pages/apis/pages/surface/navigationBar/index`
- [x] `pages/apis/pages/surface/background/index` → `playground/pages/apis/pages/surface/background/index`
- [x] `pages/apis/pages/surface/refresh/index` → `playground/pages/apis/pages/surface/refresh/index`
- [x] `pages/apis/pages/surface/scroll/index` → `playground/pages/apis/pages/surface/scroll/index`
- [x] `pages/apis/pages/surface/tabBar/index` → `playground/pages/apis/pages/surface/tabBar/index`
- [x] `pages/apis/pages/surface/window/index` → `playground/pages/apis/pages/surface/window/index`
- [x] `pages/apis/pages/surface/keyboard/index` → `playground/pages/apis/pages/surface/keyboard/index`
- [x] `pages/apis/pages/network/request/index` → `playground/pages/apis/pages/network/request/index`
- [x] `pages/apis/pages/storage/index/index` → `playground/pages/apis/pages/storage/index/index`
- [x] `pages/apis/pages/media/image/index` → `playground/pages/apis/pages/media/image/index`
- [x] `pages/apis/pages/media/video/index` → `playground/pages/apis/pages/media/video/index`
- [x] `pages/apis/pages/media/camera/index` → `playground/pages/apis/pages/media/camera/index`
- [x] `pages/apis/pages/location/index/index` → `playground/pages/apis/pages/location/index/index`
- [x] `pages/apis/pages/device/network/index` → `playground/pages/apis/pages/device/network/index`
- [x] `pages/apis/pages/device/screen/index` → `playground/pages/apis/pages/device/screen/index`
- [x] `pages/apis/pages/device/phone/index` → `playground/pages/apis/pages/device/phone/index`
- [x] `pages/apis/pages/device/accelerometer/index` → `playground/pages/apis/pages/device/accelerometer/index`
- [x] `pages/apis/pages/device/deviceMotion/index` → `playground/pages/apis/pages/device/deviceMotion/index`
- [x] `pages/apis/pages/device/gyroscope/index` → `playground/pages/apis/pages/device/gyroscope/index`
- [x] `pages/apis/pages/device/scanCode/index` → `playground/pages/apis/pages/device/scanCode/index`
- [x] `pages/apis/pages/device/vibrate/index` → `playground/pages/apis/pages/device/vibrate/index`
- [x] `pages/apis/pages/open-api/settings/index` → `playground/pages/apis/pages/open-api/settings/index`
- [x] `pages/about/index` → `playground/pages/about/index`
- [x] `pages/about/dep` → `playground/pages/about/dep`
- [x] `pages/about/mini` → `playground/pages/about/mini`
- [x] `pages/about/rn` → `playground/pages/about/rn`
- [x] `pages/webview/index` → `playground/pages/webview/index`
- [x] `pages/explore/index` → `playground/pages/explore/index`
- [x] `pages/explore/animate/lottie/index` → `playground/pages/explore/animate/lottie/index`
- [x] `pages/explore/others/linear-gradient/index` → `playground/pages/explore/others/linear-gradient/index`
- [x] `pages/explore/charts/pages/bar/barPolarRealEstate` → `playground/pages/explore/charts/pages/bar/barPolarRealEstate`
- [x] `pages/explore/charts/pages/scatter/bubbleGradient` → `playground/pages/explore/charts/pages/scatter/bubbleGradient`
- [x] `pages/explore/charts/pages/pie/pieNest` → `playground/pages/explore/charts/pages/pie/pieNest`
- [x] `pages/explore/charts/pages/pie/pieSimple` → `playground/pages/explore/charts/pages/pie/pieSimple`
- [x] `pages/explore/charts/pages/pie/pieBorderRadius` → `playground/pages/explore/charts/pages/pie/pieBorderRadius`
- [x] `pages/explore/charts/pages/pie/pieDoughnut` → `playground/pages/explore/charts/pages/pie/pieDoughnut`
- [x] `pages/explore/charts/pages/pie/pieCustom` → `playground/pages/explore/charts/pages/pie/pieCustom`
- [x] `pages/explore/charts/pages/pie/piePattern` → `playground/pages/explore/charts/pages/pie/piePattern`
- [x] `pages/explore/charts/pages/pie/pieRoseType` → `playground/pages/explore/charts/pages/pie/pieRoseType`
- [x] `pages/explore/charts/pages/pie/pieRoseTypeSimple` → `playground/pages/explore/charts/pages/pie/pieRoseTypeSimple`
- [x] `pages/explore/charts/pages/pie/pieAlignTo` → `playground/pages/explore/charts/pages/pie/pieAlignTo`
- [x] `pages/explore/charts/pages/pie/pieLabelLineAdjust` → `playground/pages/explore/charts/pages/pie/pieLabelLineAdjust`
- [x] `pages/explore/charts/pages/pie/pieLegend` → `playground/pages/explore/charts/pages/pie/pieLegend`
- [x] `pages/explore/charts/pages/scatter/scatterLarge` → `playground/pages/explore/charts/pages/scatter/scatterLarge`
- [x] `pages/explore/charts/pages/line/lineMarkline` → `playground/pages/explore/charts/pages/line/lineMarkline`
- [x] `pages/explore/charts/pages/scatter/effectScatterBmap` → `playground/pages/explore/charts/pages/scatter/effectScatterBmap`
- [x] `pages/explore/charts/pages/bar/barNegative` → `playground/pages/explore/charts/pages/bar/barNegative`
- [x] `pages/explore/charts/pages/line/areaPieces` → `playground/pages/explore/charts/pages/line/areaPieces`
- [x] `pages/explore/charts/pages/line/lineSections` → `playground/pages/explore/charts/pages/line/lineSections`
- [x] `pages/explore/charts/pages/line/lineTooltipTouch` → `playground/pages/explore/charts/pages/line/lineTooltipTouch`
- [x] `pages/explore/charts/pages/line/lineSimple` → `playground/pages/explore/charts/pages/line/lineSimple`
- [x] `pages/explore/charts/pages/line/lineSmooth` → `playground/pages/explore/charts/pages/line/lineSmooth`
- [x] `pages/explore/charts/pages/line/areaBasic` → `playground/pages/explore/charts/pages/line/areaBasic`
- [x] `pages/explore/charts/pages/line/lineStack` → `playground/pages/explore/charts/pages/line/lineStack`
- [x] `pages/explore/charts/pages/line/areaStack` → `playground/pages/explore/charts/pages/line/areaStack`
- [x] `pages/explore/charts/pages/line/areaStackGradient` → `playground/pages/explore/charts/pages/line/areaStackGradient`
- [x] `pages/explore/charts/pages/line/lineMarker` → `playground/pages/explore/charts/pages/line/lineMarker`
- [x] `pages/explore/charts/pages/line/dataTransformFilter` → `playground/pages/explore/charts/pages/line/dataTransformFilter`
- [x] `pages/explore/charts/pages/line/lineGradient` → `playground/pages/explore/charts/pages/line/lineGradient`
- [x] `pages/explore/charts/pages/line/confidenceBand` → `playground/pages/explore/charts/pages/line/confidenceBand`
- [x] `pages/explore/charts/pages/line/gridMultiple` → `playground/pages/explore/charts/pages/line/gridMultiple`
- [x] `pages/explore/charts/pages/line/lineAqi` → `playground/pages/explore/charts/pages/line/lineAqi`
- [x] `pages/explore/charts/pages/line/multipleXAxis` → `playground/pages/explore/charts/pages/line/multipleXAxis`
- [x] `pages/explore/charts/pages/line/areaRainfall` → `playground/pages/explore/charts/pages/line/areaRainfall`
- [x] `pages/explore/charts/pages/line/areaTimeAxis` → `playground/pages/explore/charts/pages/line/areaTimeAxis`
- [x] `pages/explore/charts/pages/line/dynamicData2` → `playground/pages/explore/charts/pages/line/dynamicData2`
- [x] `pages/explore/charts/pages/line/lineFunction` → `playground/pages/explore/charts/pages/line/lineFunction`
- [x] `pages/explore/charts/pages/line/lineRace` → `playground/pages/explore/charts/pages/line/lineRace`
- [x] `pages/explore/charts/pages/line/lineStyle` → `playground/pages/explore/charts/pages/line/lineStyle`
- [x] `pages/explore/charts/pages/line/lineInCoordinateSystem` → `playground/pages/explore/charts/pages/line/lineInCoordinateSystem`
- [x] `pages/explore/charts/pages/line/lineLog` → `playground/pages/explore/charts/pages/line/lineLog`
- [x] `pages/explore/charts/pages/line/lineStep` → `playground/pages/explore/charts/pages/line/lineStep`
- [x] `pages/explore/charts/pages/line/lineEasing` → `playground/pages/explore/charts/pages/line/lineEasing`
- [x] `pages/explore/charts/pages/line/lineYCategory` → `playground/pages/explore/charts/pages/line/lineYCategory`
- [x] `pages/explore/charts/pages/line/linePen` → `playground/pages/explore/charts/pages/line/linePen`
- [x] `pages/explore/charts/pages/line/linePolar` → `playground/pages/explore/charts/pages/line/linePolar`
- [x] `pages/explore/charts/pages/line/linePolar2` → `playground/pages/explore/charts/pages/line/linePolar2`
- [x] `pages/explore/charts/pages/line/barBackground` → `playground/pages/explore/charts/pages/line/barBackground`
- [x] `pages/explore/charts/pages/line/barSimple` → `playground/pages/explore/charts/pages/line/barSimple`
- [x] `pages/explore/charts/pages/line/barTickAlign` → `playground/pages/explore/charts/pages/line/barTickAlign`
- [x] `pages/explore/charts/pages/line/barDataColor` → `playground/pages/explore/charts/pages/line/barDataColor`
- [x] `pages/explore/charts/pages/line/barWaterfall` → `playground/pages/explore/charts/pages/line/barWaterfall`
- [x] `pages/explore/charts/pages/bar/Bar1` → `playground/pages/explore/charts/pages/bar/Bar1`
- [x] `pages/explore/charts/pages/bar/barPolarLabelRadial` → `playground/pages/explore/charts/pages/bar/barPolarLabelRadial`
- [x] `pages/explore/charts/pages/bar/barPolarLabelTangential` → `playground/pages/explore/charts/pages/bar/barPolarLabelTangential`
- [x] `pages/explore/charts/pages/bar/barYCategory` → `playground/pages/explore/charts/pages/bar/barYCategory`
- [x] `pages/explore/charts/pages/bar/barGradient` → `playground/pages/explore/charts/pages/bar/barGradient`
- [x] `pages/explore/charts/pages/bar/barLabelRotation` → `playground/pages/explore/charts/pages/bar/barLabelRotation`
- [x] `pages/explore/charts/pages/bar/barStack` → `playground/pages/explore/charts/pages/bar/barStack`
- [x] `pages/explore/charts/pages/bar/barWaterfall2` → `playground/pages/explore/charts/pages/bar/barWaterfall2`
- [x] `pages/explore/charts/pages/bar/barYCategoryStack` → `playground/pages/explore/charts/pages/bar/barYCategoryStack`
- [x] `pages/explore/charts/pages/bar/barBrush` → `playground/pages/explore/charts/pages/bar/barBrush`
- [x] `pages/explore/charts/pages/bar/barNegative2` → `playground/pages/explore/charts/pages/bar/barNegative2`
- [x] `pages/explore/charts/pages/bar/mixLineBar` → `playground/pages/explore/charts/pages/bar/mixLineBar`
- [x] `pages/explore/charts/pages/bar/mixZoomOnValue` → `playground/pages/explore/charts/pages/bar/mixZoomOnValue`
- [x] `pages/explore/charts/pages/bar/multipleYAxis` → `playground/pages/explore/charts/pages/bar/multipleYAxis`
- [x] `pages/explore/charts/pages/bar/barAnimationDelay` → `playground/pages/explore/charts/pages/bar/barAnimationDelay`
- [x] `pages/explore/charts/pages/bar/barDrilldown` → `playground/pages/explore/charts/pages/bar/barDrilldown`
- [x] `pages/explore/charts/pages/bar/barLarge` → `playground/pages/explore/charts/pages/bar/barLarge`
- [x] `pages/explore/charts/pages/bar/barRace` → `playground/pages/explore/charts/pages/bar/barRace`
- [x] `pages/explore/charts/pages/bar/barRaceCountry` → `playground/pages/explore/charts/pages/bar/barRaceCountry`
- [x] `pages/explore/charts/pages/bar/dynamicData` → `playground/pages/explore/charts/pages/bar/dynamicData`
- [x] `pages/explore/charts/pages/bar/mixTimelineFinance` → `playground/pages/explore/charts/pages/bar/mixTimelineFinance`
- [x] `pages/explore/charts/pages/bar/watermark` → `playground/pages/explore/charts/pages/bar/watermark`
- [x] `pages/explore/charts/pages/bar/barPolarStack` → `playground/pages/explore/charts/pages/bar/barPolarStack`
- [x] `pages/explore/charts/pages/bar/barPolarStackRadial` → `playground/pages/explore/charts/pages/bar/barPolarStackRadial`
- [x] `pages/explore/charts/pages/bar/polarRoundCap` → `playground/pages/explore/charts/pages/bar/polarRoundCap`
- [x] `pages/explore/charts/pages/scatter/scatterSingleAxis` → `playground/pages/explore/charts/pages/scatter/scatterSingleAxis`
- [x] `pages/explore/charts/pages/scatter/scatterSimple` → `playground/pages/explore/charts/pages/scatter/scatterSimple`
- [x] `pages/explore/charts/pages/scatter/scatterAnscombeAuartet` → `playground/pages/explore/charts/pages/scatter/scatterAnscombeAuartet`
- [x] `pages/explore/charts/pages/scatter/scatterClustering` → `playground/pages/explore/charts/pages/scatter/scatterClustering`
- [x] `pages/explore/charts/pages/scatter/scatterClusteringProcess` → `playground/pages/explore/charts/pages/scatter/scatterClusteringProcess`
- [x] `pages/explore/charts/pages/scatter/scatterExponentialRegression` → `playground/pages/explore/charts/pages/scatter/scatterExponentialRegression`
- [x] `pages/explore/charts/pages/scatter/scatterLinearRegression` → `playground/pages/explore/charts/pages/scatter/scatterLinearRegression`
- [x] `pages/explore/charts/pages/scatter/scatterPolynomialRegression` → `playground/pages/explore/charts/pages/scatter/scatterPolynomialRegression`
- [x] `pages/explore/charts/pages/scatter/scatterLogarithmicRegression` → `playground/pages/explore/charts/pages/scatter/scatterLogarithmicRegression`
- [x] `pages/explore/charts/pages/scatter/scatterEffect` → `playground/pages/explore/charts/pages/scatter/scatterEffect`
- [x] `pages/explore/charts/pages/scatter/scatterPunchCard` → `playground/pages/explore/charts/pages/scatter/scatterPunchCard`
- [x] `pages/explore/charts/pages/scatter/scatterWeight` → `playground/pages/explore/charts/pages/scatter/scatterWeight`
- [x] `pages/explore/charts/pages/scatter/scatterAggregateBar` → `playground/pages/explore/charts/pages/scatter/scatterAggregateBar`
- [x] `pages/explore/charts/pages/scatter/scatterLabelAlignRight` → `playground/pages/explore/charts/pages/scatter/scatterLabelAlignRight`
- [x] `pages/explore/charts/pages/scatter/scatterLabelAlignTop` → `playground/pages/explore/charts/pages/scatter/scatterLabelAlignTop`
- [x] `pages/explore/charts/pages/scatter/scatterSymbolMorph` → `playground/pages/explore/charts/pages/scatter/scatterSymbolMorph`
- [x] `pages/explore/charts/pages/scatter/scatterNebula` → `playground/pages/explore/charts/pages/scatter/scatterNebula`
- [x] `pages/explore/charts/pages/scatter/scatterStreamVisual` → `playground/pages/explore/charts/pages/scatter/scatterStreamVisual`
- [x] `pages/explore/charts/pages/scatter/scatterAqiColor` → `playground/pages/explore/charts/pages/scatter/scatterAqiColor`
- [x] `pages/explore/charts/pages/scatter/scatterNutrients` → `playground/pages/explore/charts/pages/scatter/scatterNutrients`
- [x] `pages/explore/charts/pages/scatter/scatterNutrientsMatrix` → `playground/pages/explore/charts/pages/scatter/scatterNutrientsMatrix`
- [x] `pages/explore/charts/pages/scatter/scatterPolarPunchCard` → `playground/pages/explore/charts/pages/scatter/scatterPolarPunchCard`
- [x] `pages/explore/charts/pages/scatter/scatterLifeExpectancyTimeline` → `playground/pages/explore/charts/pages/scatter/scatterLifeExpectancyTimeline`
- [x] `pages/explore/charts/pages/scatter/scatterPainterChoice` → `playground/pages/explore/charts/pages/scatter/scatterPainterChoice`
- [x] `pages/explore/charts/pages/map/geoBeefCuts` → `playground/pages/explore/charts/pages/map/geoBeefCuts`
- [x] `pages/explore/charts/pages/map/mapUsaPie` → `playground/pages/explore/charts/pages/map/mapUsaPie`
- [x] `pages/explore/charts/pages/map/geoOrgan` → `playground/pages/explore/charts/pages/map/geoOrgan`
- [x] `pages/explore/charts/pages/map/geoSeatmapFlight` → `playground/pages/explore/charts/pages/map/geoSeatmapFlight`
- [x] `pages/explore/charts/pages/map/geoSvgLines` → `playground/pages/explore/charts/pages/map/geoSvgLines`
- [x] `pages/explore/charts/pages/map/geoSvgMap` → `playground/pages/explore/charts/pages/map/geoSvgMap`
- [x] `pages/explore/charts/pages/map/geoSvgScatterSimple` → `playground/pages/explore/charts/pages/map/geoSvgScatterSimple`
- [x] `pages/explore/charts/pages/map/geoSvgTraffic` → `playground/pages/explore/charts/pages/map/geoSvgTraffic`
- [x] `pages/explore/charts/pages/candlestick/candlestickSimple` → `playground/pages/explore/charts/pages/candlestick/candlestickSimple`
- [x] `pages/explore/charts/pages/candlestick/customOhlc` → `playground/pages/explore/charts/pages/candlestick/customOhlc`
- [x] `pages/explore/charts/pages/candlestick/candlestickSh` → `playground/pages/explore/charts/pages/candlestick/candlestickSh`
- [x] `pages/explore/charts/pages/candlestick/candlestickTouch` → `playground/pages/explore/charts/pages/candlestick/candlestickTouch`
- [x] `pages/explore/charts/pages/radar/radar` → `playground/pages/explore/charts/pages/radar/radar`
- [x] `pages/explore/charts/pages/radar/radarAqi` → `playground/pages/explore/charts/pages/radar/radarAqi`
- [x] `pages/explore/charts/pages/radar/radar2` → `playground/pages/explore/charts/pages/radar/radar2`
- [x] `pages/explore/charts/pages/radar/radarCustom` → `playground/pages/explore/charts/pages/radar/radarCustom`
- [x] `pages/explore/charts/pages/radar/radarMultiple` → `playground/pages/explore/charts/pages/radar/radarMultiple`
- [x] `pages/explore/charts/pages/boxplot/boxplotLightVelocity` → `playground/pages/explore/charts/pages/boxplot/boxplotLightVelocity`
- [x] `pages/explore/charts/pages/boxplot/boxplotMulti` → `playground/pages/explore/charts/pages/boxplot/boxplotMulti`
- [x] `pages/explore/charts/pages/boxplot/boxplotLightVelocity2` → `playground/pages/explore/charts/pages/boxplot/boxplotLightVelocity2`
- [x] `pages/explore/charts/pages/heatmap/heatmapCartesian` → `playground/pages/explore/charts/pages/heatmap/heatmapCartesian`
- [x] `pages/explore/charts/pages/heatmap/heatmapLargePiecewise` → `playground/pages/explore/charts/pages/heatmap/heatmapLargePiecewise`
- [x] `pages/explore/charts/pages/graph/graphForce2` → `playground/pages/explore/charts/pages/graph/graphForce2`
- [x] `pages/explore/charts/pages/graph/GraphForceDynamic` → `playground/pages/explore/charts/pages/graph/GraphForceDynamic`
- [x] `pages/explore/charts/pages/graph/graphSimple` → `playground/pages/explore/charts/pages/graph/graphSimple`
- [x] `pages/explore/charts/pages/lines/hangzhouLines` → `playground/pages/explore/charts/pages/lines/hangzhouLines`
- [x] `pages/explore/charts/pages/tree/treeBasic` → `playground/pages/explore/charts/pages/tree/treeBasic`
- [x] `pages/explore/charts/pages/tree/multipleTrees` → `playground/pages/explore/charts/pages/tree/multipleTrees`
- [x] `pages/explore/charts/pages/tree/bottomTopTree` → `playground/pages/explore/charts/pages/tree/bottomTopTree`
- [x] `pages/explore/charts/pages/tree/rightLeftTree` → `playground/pages/explore/charts/pages/tree/rightLeftTree`
- [x] `pages/explore/charts/pages/tree/polylineTree` → `playground/pages/explore/charts/pages/tree/polylineTree`
- [x] `pages/explore/charts/pages/tree/radialTree` → `playground/pages/explore/charts/pages/tree/radialTree`
- [x] `pages/explore/charts/pages/tree/topBottomTree` → `playground/pages/explore/charts/pages/tree/topBottomTree`
- [x] `pages/explore/charts/pages/treemap/sunburstTransition` → `playground/pages/explore/charts/pages/treemap/sunburstTransition`
- [x] `pages/explore/charts/pages/treemap/echartsOptionQuery` → `playground/pages/explore/charts/pages/treemap/echartsOptionQuery`
- [x] `pages/explore/charts/pages/treemap/howTrillionSpent` → `playground/pages/explore/charts/pages/treemap/howTrillionSpent`
- [x] `pages/explore/charts/pages/treemap/showParentLabels` → `playground/pages/explore/charts/pages/treemap/showParentLabels`
- [x] `pages/explore/charts/pages/treemap/basicTreemap` → `playground/pages/explore/charts/pages/treemap/basicTreemap`
- [x] `pages/explore/charts/pages/treemap/gradientMapping` → `playground/pages/explore/charts/pages/treemap/gradientMapping`
- [x] `pages/explore/charts/pages/treemap/treemapDisk` → `playground/pages/explore/charts/pages/treemap/treemapDisk`
- [x] `pages/explore/charts/pages/sunburst/sunburstSimple` → `playground/pages/explore/charts/pages/sunburst/sunburstSimple`
- [x] `pages/explore/charts/pages/sunburst/roundedCornerSunburst` → `playground/pages/explore/charts/pages/sunburst/roundedCornerSunburst`
- [x] `pages/explore/charts/pages/sunburst/sunburstLabelRotate` → `playground/pages/explore/charts/pages/sunburst/sunburstLabelRotate`
- [x] `pages/explore/charts/pages/sunburst/monochromeSunburst` → `playground/pages/explore/charts/pages/sunburst/monochromeSunburst`
- [x] `pages/explore/charts/pages/sunburst/sunburstVisualMap` → `playground/pages/explore/charts/pages/sunburst/sunburstVisualMap`
- [x] `pages/explore/charts/pages/sunburst/drinkFlavors` → `playground/pages/explore/charts/pages/sunburst/drinkFlavors`
- [x] `pages/explore/charts/pages/sunburst/bookRecords` → `playground/pages/explore/charts/pages/sunburst/bookRecords`
- [x] `pages/explore/charts/pages/parallel/parallelSimple` → `playground/pages/explore/charts/pages/parallel/parallelSimple`
- [x] `pages/explore/charts/pages/parallel/parallelAqi` → `playground/pages/explore/charts/pages/parallel/parallelAqi`
- [x] `pages/explore/charts/pages/parallel/parallelNutrients` → `playground/pages/explore/charts/pages/parallel/parallelNutrients`
- [x] `pages/explore/charts/pages/parallel/scatterMatrix` → `playground/pages/explore/charts/pages/parallel/scatterMatrix`
- [x] `pages/explore/charts/pages/sankey/sankeySimple` → `playground/pages/explore/charts/pages/sankey/sankeySimple`
- [x] `pages/explore/charts/pages/sankey/sankeyOrientVertical` → `playground/pages/explore/charts/pages/sankey/sankeyOrientVertical`
- [x] `pages/explore/charts/pages/sankey/specifyItemStyle` → `playground/pages/explore/charts/pages/sankey/specifyItemStyle`
- [x] `pages/explore/charts/pages/sankey/levelsSetting` → `playground/pages/explore/charts/pages/sankey/levelsSetting`
- [x] `pages/explore/charts/pages/sankey/gradientEdge` → `playground/pages/explore/charts/pages/sankey/gradientEdge`
- [x] `pages/explore/charts/pages/sankey/nodeAlignLeft` → `playground/pages/explore/charts/pages/sankey/nodeAlignLeft`
- [x] `pages/explore/charts/pages/sankey/nodeAlignRight` → `playground/pages/explore/charts/pages/sankey/nodeAlignRight`
- [x] `pages/explore/charts/pages/funnel/funnelChart` → `playground/pages/explore/charts/pages/funnel/funnelChart`
- [x] `pages/explore/charts/pages/funnel/funnelCompare` → `playground/pages/explore/charts/pages/funnel/funnelCompare`
- [x] `pages/explore/charts/pages/funnel/funnelCustomize` → `playground/pages/explore/charts/pages/funnel/funnelCustomize`
- [x] `pages/explore/charts/pages/funnel/funnel` → `playground/pages/explore/charts/pages/funnel/funnel`
- [x] `pages/explore/charts/pages/gauge/gaugeBasic` → `playground/pages/explore/charts/pages/gauge/gaugeBasic`
- [x] `pages/explore/charts/pages/gauge/gaugeSimple` → `playground/pages/explore/charts/pages/gauge/gaugeSimple`
- [x] `pages/explore/charts/pages/gauge/speedGauge` → `playground/pages/explore/charts/pages/gauge/speedGauge`
- [x] `pages/explore/charts/pages/gauge/progressGauge` → `playground/pages/explore/charts/pages/gauge/progressGauge`
- [x] `pages/explore/charts/pages/gauge/stageSpeedGauge` → `playground/pages/explore/charts/pages/gauge/stageSpeedGauge`
- [x] `pages/explore/charts/pages/gauge/gradeGauge` → `playground/pages/explore/charts/pages/gauge/gradeGauge`
- [x] `pages/explore/charts/pages/gauge/multiTitleGauge` → `playground/pages/explore/charts/pages/gauge/multiTitleGauge`
- [x] `pages/explore/charts/pages/gauge/temperatureGauge` → `playground/pages/explore/charts/pages/gauge/temperatureGauge`
- [x] `pages/explore/charts/pages/gauge/ringGauge` → `playground/pages/explore/charts/pages/gauge/ringGauge`
- [x] `pages/explore/charts/pages/gauge/gaugeBarometer` → `playground/pages/explore/charts/pages/gauge/gaugeBarometer`
- [x] `pages/explore/charts/pages/gauge/clock` → `playground/pages/explore/charts/pages/gauge/clock`
- [x] `pages/explore/charts/pages/gauge/gaugeCar` → `playground/pages/explore/charts/pages/gauge/gaugeCar`
- [x] `pages/explore/charts/pages/pictorialBar/transition` → `playground/pages/explore/charts/pages/pictorialBar/transition`
- [x] `pages/explore/charts/pages/pictorialBar/pictorialBarBodyFill` → `playground/pages/explore/charts/pages/pictorialBar/pictorialBarBodyFill`
- [x] `pages/explore/charts/pages/pictorialBar/dottedBar` → `playground/pages/explore/charts/pages/pictorialBar/dottedBar`
- [x] `pages/explore/charts/pages/pictorialBar/expansionForest` → `playground/pages/explore/charts/pages/pictorialBar/expansionForest`
- [x] `pages/explore/charts/pages/pictorialBar/wishAndMountain` → `playground/pages/explore/charts/pages/pictorialBar/wishAndMountain`
- [x] `pages/explore/charts/pages/pictorialBar/spirits` → `playground/pages/explore/charts/pages/pictorialBar/spirits`
- [x] `pages/explore/charts/pages/pictorialBar/vehicles` → `playground/pages/explore/charts/pages/pictorialBar/vehicles`
- [x] `pages/explore/charts/pages/pictorialBar/velocityOfReindeers` → `playground/pages/explore/charts/pages/pictorialBar/velocityOfReindeers`
- [x] `pages/explore/charts/pages/themeRiver/themeRiverBasic` → `playground/pages/explore/charts/pages/themeRiver/themeRiverBasic`
- [x] `pages/explore/charts/pages/themeRiver/themeRiverLastfm` → `playground/pages/explore/charts/pages/themeRiver/themeRiverLastfm`
- [x] `pages/explore/charts/pages/calendar/calendarSimple` → `playground/pages/explore/charts/pages/calendar/calendarSimple`
- [x] `pages/explore/charts/pages/calendar/heatmap` → `playground/pages/explore/charts/pages/calendar/heatmap`
- [x] `pages/explore/charts/pages/calendar/heatmapVertical` → `playground/pages/explore/charts/pages/calendar/heatmapVertical`
- [x] `pages/explore/charts/pages/calendar/heatmapHorizontal` → `playground/pages/explore/charts/pages/calendar/heatmapHorizontal`
- [x] `pages/explore/charts/pages/calendar/calendarGraph` → `playground/pages/explore/charts/pages/calendar/calendarGraph`
- [x] `pages/explore/charts/pages/calendar/calendarLunar` → `playground/pages/explore/charts/pages/calendar/calendarLunar`
- [x] `pages/explore/charts/pages/calendar/calendarPie` → `playground/pages/explore/charts/pages/calendar/calendarPie`
- [x] `pages/explore/charts/pages/calendar/calendarCharts` → `playground/pages/explore/charts/pages/calendar/calendarCharts`
- [x] `pages/explore/charts/pages/calendar/customCalendarIcon` → `playground/pages/explore/charts/pages/calendar/customCalendarIcon`
- [x] `pages/explore/charts/pages/custom/histogram` → `playground/pages/explore/charts/pages/custom/histogram`
- [x] `pages/explore/charts/pages/custom/customProfit` → `playground/pages/explore/charts/pages/custom/customProfit`
- [x] `pages/explore/charts/pages/custom/errorScatter` → `playground/pages/explore/charts/pages/custom/errorScatter`
- [x] `pages/explore/charts/pages/custom/customBarTrend` → `playground/pages/explore/charts/pages/custom/customBarTrend`
- [x] `pages/explore/charts/pages/custom/cartesianPolygon` → `playground/pages/explore/charts/pages/custom/cartesianPolygon`
- [x] `pages/explore/charts/pages/custom/errorBar` → `playground/pages/explore/charts/pages/custom/errorBar`
- [x] `pages/explore/charts/pages/custom/cyclePlot` → `playground/pages/explore/charts/pages/custom/cyclePlot`
- [x] `pages/explore/charts/pages/custom/ganttChart` → `playground/pages/explore/charts/pages/custom/ganttChart`
- [x] `pages/explore/charts/pages/custom/polarHeatmap` → `playground/pages/explore/charts/pages/custom/polarHeatmap`
- [x] `pages/explore/charts/pages/custom/windBarb` → `playground/pages/explore/charts/pages/custom/windBarb`
- [x] `pages/explore/charts/pages/custom/customCalendarIcon` → `playground/pages/explore/charts/pages/custom/customCalendarIcon`
- [x] `pages/explore/charts/pages/custom/windVectors` → `playground/pages/explore/charts/pages/custom/windVectors`
- [x] `pages/explore/charts/pages/custom/hexagonalBinning` → `playground/pages/explore/charts/pages/custom/hexagonalBinning`
- [x] `pages/explore/charts/pages/custom/PieParliamentTransition` → `playground/pages/explore/charts/pages/custom/PieParliamentTransition`
- [x] `pages/explore/charts/pages/custom/CustomGauge` → `playground/pages/explore/charts/pages/custom/CustomGauge`
- [x] `pages/explore/charts/pages/custom/customizedEffect` → `playground/pages/explore/charts/pages/custom/customizedEffect`
- [x] `pages/explore/charts/pages/custom/customProfile` → `playground/pages/explore/charts/pages/custom/customProfile`
- [x] `pages/explore/charts/pages/custom/circlePacking` → `playground/pages/explore/charts/pages/custom/circlePacking`
- [x] `pages/explore/charts/pages/custom/customSpiralRace` → `playground/pages/explore/charts/pages/custom/customSpiralRace`
- [x] `pages/explore/charts/pages/dataset/dataTransformSortBar` → `playground/pages/explore/charts/pages/dataset/dataTransformSortBar`
- [x] `pages/explore/charts/pages/dataset/DatasetLink` → `playground/pages/explore/charts/pages/dataset/DatasetLink`
- [x] `pages/explore/charts/pages/dataset/datasetEncode0` → `playground/pages/explore/charts/pages/dataset/datasetEncode0`
- [x] `pages/explore/charts/pages/dataset/dataTransformMultiplePie` → `playground/pages/explore/charts/pages/dataset/dataTransformMultiplePie`
- [x] `pages/explore/charts/pages/dataset/encodeAndMatrix` → `playground/pages/explore/charts/pages/dataset/encodeAndMatrix`
- [x] `pages/explore/charts/pages/dataset/datasetSeriesLayoutBy` → `playground/pages/explore/charts/pages/dataset/datasetSeriesLayoutBy`
- [x] `pages/explore/charts/pages/dataset/datasetSimple0` → `playground/pages/explore/charts/pages/dataset/datasetSimple0`
- [x] `pages/explore/charts/pages/dataset/datasetSimple1` → `playground/pages/explore/charts/pages/dataset/datasetSimple1`
- [x] `pages/explore/charts/pages/dataset/datasetDefault` → `playground/pages/explore/charts/pages/dataset/datasetDefault`
- [x] `pages/explore/charts/pages/dataZoom/customErrorScatter` → `playground/pages/explore/charts/pages/dataZoom/customErrorScatter`
- [x] `pages/explore/charts/pages/dataZoom/areaSimple` → `playground/pages/explore/charts/pages/dataZoom/areaSimple`
- [x] `pages/explore/charts/pages/graphic/graphicStrokeAnimation` → `playground/pages/explore/charts/pages/graphic/graphicStrokeAnimation`
- [x] `pages/explore/charts/pages/graphic/graphicLoading` → `playground/pages/explore/charts/pages/graphic/graphicLoading`
- [x] `pages/explore/charts/pages/graphic/GraphicWaveAnimation` → `playground/pages/explore/charts/pages/graphic/GraphicWaveAnimation`
- [x] `pages/explore/charts/pages/graphic/lineGraphic` → `playground/pages/explore/charts/pages/graphic/lineGraphic`
- [x] `pages/explore/charts/pages/graphic/LineDraggable` → `playground/pages/explore/charts/pages/graphic/LineDraggable`
- [x] `pages/explore/charts/pages/rich/barRichText` → `playground/pages/explore/charts/pages/rich/barRichText`
- [x] `pages/explore/charts/pages/rich/pieRichText` → `playground/pages/explore/charts/pages/rich/pieRichText`


## 适配与目录

- `src/pages/playground/index.tsx`：独立示例首页。
- `src/playground/pages`：源页面、公共组件及图表选项，297 条原启用路由全部注册。
- `src/playground/assets`、`styles`：源资源与样式。
- `src/playground/platform`：HTYF 平台文件、存储隔离及旧宿主能力提示。
- `src/playground/source-package.json`、`LICENSE`、`NOTICE`：源版本与授权记录；依赖展示页读取当前 taro-playground 的 package.json。
- `.htyf-migration/pending-source-state.json`：527 个源文件的 SHA-256 和页面清单，后续增量迁移以此比对；完整宿主验收基线尚未建立。

原项目是 Taro + React Native（含 app.rn.tsx），本次继续使用现有 `_taro_temp_` 的 Taro 4.2.1 / HTYF 0.7.0 架构；原生工程直接保留本仓库模板文件，未作业务修改。`.rn.*` 业务文件改为 `.htyf.*`，平台配置采用 `htyf`，保留构建所需 `pxtransform.platform: 'rn'`。

## 独立 example 验证

在 `htyf-cli/examples/taro-playground` 目录执行：

```sh
pnpm install --frozen-lockfile
pnpm check:playground
pnpm typecheck
pnpm bundle:ios
```

路由、静态引用、平台文件命名、TabBar 状态/回调/路由校验和存储隔离测试通过。Playground 独立类型检查通过；其 noUnused 设置保持源示例允许未使用演示变量的习惯。独立安装不再依赖原 taro-ui 仓库；虚拟列表所需 `@tarojs/components-advanced@4.2.1` 已显式声明，全局类型限定为 node/react/webpack-env。

`pnpm build:htyf` 是交互菜单；`bundle:ios` 使用其底层 `react-native bundle` 命令，避免自动修改版本和发布产物。输出在 `dist/ios/`，不提交生成 Bundle。Android 可运行 `pnpm bundle:android`，本次未验证 Android 或真实设备。

最终独立 iOS 编译通过（退出码 0，1 条 Webpack 动态 require 警告，另有源样式/Sass 提示）。相机、定位等设备行为未作真机验收，旧 RNDevManager Bundle 和 BMap 限制保持原记录，详见 [htyf-migration-gaps.md](htyf-migration-gaps.md)。

## 旧位置清理

`taro-ui/examples/demo-htyf` 中的本次入口、路由、功能目录、迁移文档、校验脚本和独立检查配置已移除。新增的 Playground 直接依赖已卸载并更新旧仓库锁文件；既有版本号修改保留。

样式适配参考 [Taro React Native 开发注意事项](https://docs.taro.zone/docs/react-native-remind)。

已检查最终 Bundle 包含全部 297 条功能路由。

## 2026-09-09 菜单对齐

- [x] 恢复源首页与六个底部 Tab 的名称、顺序、图标、选中色。
- [x] 移除额外入口页和页面内标签，恢复 Taro TabBar API、switchTab 与 Navigator。
- [x] 对照源全局、组件、接口、探索、关于菜单数据和入口。
- [x] 路由/菜单回归检查、类型检查和 HTYF 构建。

本次仅同步菜单；已有原生能力阻塞及真机验收状态保持待验收，不推进完整迁移基线。

验证：`pnpm check:playground`（297 路由及底部菜单回归）、`pnpm typecheck` 通过；全局/组件/接口菜单数据、探索/关于菜单数组与源文件对比通过，图标字节一致。`pnpm bundle:ios` 在 TARO_ENV=htyf 下成功（webpack 1 warning，现有样式转换仍有警告）。`pnpm build:htyf` 在交互菜单前因 macOS system-configuration NULL object 崩溃，已终止；使用示例现有非交互 bundle 脚本完成编译验证。底部菜单交互和返回行为待真机验收。

## 2026-09-09 Workspace 依赖

示例纳入根 `pnpm-workspace.yaml`。11 个与 `packages/` 对应的 `@htyf-mp/*` 直接依赖改为 `workspace:*`，删除示例独立 workspace/锁文件，使用根 `pnpm-lock.yaml`。Webpack 和 Taro 配置按包解析路径，兼容依赖提升。原独立 `node_modules` 已备份至 `/tmp/htyf-taro-node-modules-before-workspace-20260909`，并按根锁文件重建。

Workspace 验证：根锁文件冻结安装、11 项依赖声明/锁记录/实际链接一致性、本地 packages 全量构建、示例类型检查均通过。类型查找改为允许 pnpm 上级目录提升，样式转换器编译仅载入 Node 类型；Webpack 保留链接路径以识别 Taro 占位入口。现有菜单检查仍要求期间已移除的 `pages/home/index`，保留并行页面修改，本次不改菜单验收预期。

最终 `pnpm --filter './examples/taro' bundle:ios` 成功，当前 296 条路由全部进入产物。Webpack 有 14 条警告：提升依赖后 React / expo-modules-core 的共享版本无法自动推断（13 条）及 Reanimated 动态 require（1 条）；源样式兼容警告仍存在，运行效果待真机验收。
