import type { FeatureCollection, Point as GeoPoint } from 'geojson'
import maplibregl, { type GeoJSONSource, type Map as MapLibre } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import { mapStyleUrl } from '../lib/config'
import type { LatLng } from '../lib/geo'
import type { Point, Site } from '../lib/types'

type Props = {
  recyclers: Site[]
  points: Point[]
  origin: LatLng | null
  selectedId: string | null
  onSelect: (id: string) => void
}

const india: [number, number] = [78.9, 22.5]

function siteFeatures(recyclers: Site[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: recyclers
      .filter((r) => r.lat !== null && r.lng !== null)
      .map((r) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [r.lng!, r.lat!] },
        properties: { id: r.id, kind: r.type, name: r.name, approximate: r.location?.approximate ?? true },
      })),
  }
}

function pointFeatures(points: Point[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { id: p.id, kind: 'partner', name: p.name },
    })),
  }
}

export function RecyclerMap({ recyclers, points, origin, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibre | null>(null)
  const originMarker = useRef<maplibregl.Marker | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    if (!container.current) return
    const instance = new maplibregl.Map({
      container: container.current,
      style: mapStyleUrl(),
      center: india,
      zoom: 3.9,
      attributionControl: { compact: true },
    })
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    instance.on('load', () => {
      instance.addSource('sites', { type: 'geojson', data: siteFeatures([]), cluster: true, clusterRadius: 42, clusterMaxZoom: 10 })
      instance.addSource('partners', { type: 'geojson', data: pointFeatures([]) })
      instance.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'sites',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#15171c',
          'circle-opacity': 0.85,
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 40, 24],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
      instance.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'sites',
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Amazon Ember Bold', 'Noto Sans Bold'] },
        paint: { 'text-color': '#ffffff' },
      })
      instance.addLayer({
        id: 'sites',
        type: 'circle',
        source: 'sites',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['match', ['get', 'kind'], 'refurbisher', '#f7b500', '#0e9be0'],
          'circle-radius': 6.5,
          'circle-opacity': ['case', ['get', 'approximate'], 0.45, 1],
          'circle-stroke-width': 2,
          'circle-stroke-color': ['case', ['get', 'approximate'], ['match', ['get', 'kind'], 'refurbisher', '#f7b500', '#0e9be0'], '#ffffff'],
        },
      })
      instance.addLayer({
        id: 'partners',
        type: 'circle',
        source: 'partners',
        paint: {
          'circle-color': '#d9672e',
          'circle-radius': 10,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })
      for (const layer of ['sites', 'partners']) {
        instance.on('click', layer, (e) => {
          const id = e.features?.[0]?.properties?.id
          if (id) selectRef.current(String(id))
        })
      }
      instance.on('click', 'clusters', async (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const source = instance.getSource('sites') as GeoJSONSource
        const zoom = await source.getClusterExpansionZoom(feature.properties?.cluster_id)
        instance.easeTo({ center: (feature.geometry as GeoPoint).coordinates as [number, number], zoom })
      })
      for (const layer of ['sites', 'clusters', 'partners']) {
        instance.on('mouseenter', layer, () => (instance.getCanvas().style.cursor = 'pointer'))
        instance.on('mouseleave', layer, () => (instance.getCanvas().style.cursor = ''))
      }
      instance.fire('safedrop:ready')
    })
    map.current = instance
    return () => instance.remove()
  }, [])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const apply = () => {
      ;(instance.getSource('sites') as GeoJSONSource | undefined)?.setData(siteFeatures(recyclers))
      ;(instance.getSource('partners') as GeoJSONSource | undefined)?.setData(pointFeatures(points))
    }
    if (instance.getSource('sites')) apply()
    else instance.once('safedrop:ready', apply)
  }, [recyclers, points])

  useEffect(() => {
    const instance = map.current
    if (!instance || !origin) return
    originMarker.current?.remove()
    const el = document.createElement('div')
    el.className = 'size-4 rounded-full border-[3px] border-white bg-ink shadow-[0_0_0_6px_rgba(14,155,224,0.25)]'
    originMarker.current = new maplibregl.Marker({ element: el }).setLngLat([origin.lng, origin.lat]).addTo(instance)
    instance.flyTo({ center: [origin.lng, origin.lat], zoom: 9.5, speed: 1.6 })
  }, [origin])

  useEffect(() => {
    const instance = map.current
    if (!instance || !selectedId) return
    const site = recyclers.find((r) => r.id === selectedId) ?? points.find((p) => p.id === selectedId)
    if (site && site.lat !== null && site.lng !== null) instance.flyTo({ center: [site.lng!, site.lat!], zoom: Math.max(instance.getZoom(), 12), speed: 1.4 })
  }, [selectedId, recyclers, points])

  return <div ref={container} className="h-full w-full" />
}
