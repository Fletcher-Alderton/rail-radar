import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import fs from 'fs';
import path from 'path';

// Initialize Convex client
// Replace with your actual Convex deployment URL
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://healthy-ibex-649.convex.cloud");

async function loadJSONFile(filePath: string) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, (error as Error).message);
    return null;
  }
}

function transformStopsData(stopsData: any[]) {
  return stopsData.map(station => ({
    station_id: station.station_id,
    station_name: station.station_name,
    station_lat: station.station_lat,
    station_lon: station.station_lon,
    platforms: station.platforms || []
  }));
}

function transformRoutesData(routesData: any[]) {
  return routesData.map(route => ({
    route_id: route.route_id,
    route_type: route.route_type,
    route_long_name: route.route_long_name || null,
    route_short_name: route.route_short_name || null
  }));
}

function transformTripsData(tripsData: any[]) {
  return tripsData.map(trip => ({
    trip_id: trip.trip_id,
    route_id: trip.route_id,
    trip_headsign: trip.trip_headsign,
    shape_id: trip.shape_id
  }));
}

function transformShapesData(shapesData: any[]) {
  const groupedShapes: { [key: string]: any } = {};
  
  shapesData.forEach(shapePoint => {
    if (!groupedShapes[shapePoint.shape_id]) {
      groupedShapes[shapePoint.shape_id] = {
        shape_id: shapePoint.shape_id,
        points: []
      };
    }
    
    groupedShapes[shapePoint.shape_id].points.push({
      lat: shapePoint.shape_pt_lat,
      lon: shapePoint.shape_pt_lon,
      sequence: shapePoint.shape_pt_sequence
    });
  });
  
  // Sort points by sequence for each shape
  Object.values(groupedShapes).forEach((shape: any) => {
    shape.points.sort((a: any, b: any) => a.sequence - b.sequence);
  });
  
  return Object.values(groupedShapes);
}

function transformPrecomputedRoutesData(routesData: any) {
  const result: any[] = [];
  
  Object.entries(routesData).forEach(([key, value]: [string, any]) => {
    result.push({
      id: key,
      from_stop_id: value.from.stop_id,
      from_stop_name: value.from.stop_name,
      from_lat: value.from.stop_lat,
      from_lon: value.from.stop_lon,
      to_stop_id: value.to.stop_id,
      to_stop_name: value.to.stop_name,
      to_lat: value.to.stop_lat,
      to_lon: value.to.stop_lon,
      direct_routes: value.direct_routes || [],
      transfer_routes: value.transfer_routes || []
    });
  });
  
  return result;
}

async function uploadBasicData() {
  console.log('Loading basic data files...');
  
  const dataDir = path.join(__dirname, '../public/data');
  
  // Load JSON files
  const stopsData = await loadJSONFile(path.join(dataDir, 'stops.json'));
  const routesData = await loadJSONFile(path.join(dataDir, 'routes.json'));
  const tripsData = await loadJSONFile(path.join(dataDir, 'trips.json'));
  const shapesData = await loadJSONFile(path.join(dataDir, 'shapes.json'));
  const precomputedRoutesData = await loadJSONFile(path.join(dataDir, 'routes_precomputed.json'));
  
  if (!stopsData || !routesData || !tripsData) {
    console.error('Failed to load one or more required data files (stops, routes, trips)');
    return;
  }
  
  // Transform data
  console.log('Transforming data...');
  const stations = transformStopsData(stopsData);
  const routes = transformRoutesData(routesData);
  const trips = transformTripsData(tripsData);
  
  console.log(`Prepared ${stations.length} stations`);
  console.log(`Prepared ${routes.length} routes`);
  console.log(`Prepared ${trips.length} trips`);
  
  // Transform shapes data if available
  let shapes: any[] = [];
  if (shapesData) {
    shapes = transformShapesData(shapesData);
    console.log(`Prepared ${shapes.length} shapes`);
  } else {
    console.log('Shapes data not found, skipping shapes upload');
  }
  
  // Transform precomputed routes data if available
  let precomputedRoutes: any[] = [];
  if (precomputedRoutesData) {
    precomputedRoutes = transformPrecomputedRoutesData(precomputedRoutesData);
    console.log(`Prepared ${precomputedRoutes.length} precomputed routes`);
  } else {
    console.log('Precomputed routes data not found, skipping precomputed routes upload');
  }
  
  try {
    // Upload stations
    console.log('Uploading stations...');
    const stationsResult = await convex.mutation(api.dataUpload.uploadStations, { stations });
    console.log(`Uploaded ${stationsResult.inserted} stations`);
    
    // Upload routes
    console.log('Uploading routes...');
    const routesResult = await convex.mutation(api.dataUpload.uploadRoutes, { routes });
    console.log(`Uploaded ${routesResult.inserted} routes`);
    
    // Upload trips in batches (Convex has a limit of 8192 array elements)
    console.log('Uploading trips in batches...');
    const tripsBatchSize = 8000; // Slightly under the limit for safety
    let totalTripsUploaded = 0;
    
    for (let i = 0; i < trips.length; i += tripsBatchSize) {
      const batch = trips.slice(i, i + tripsBatchSize);
      const batchNumber = Math.floor(i / tripsBatchSize) + 1;
      const totalBatches = Math.ceil(trips.length / tripsBatchSize);
      
      console.log(`Uploading trips batch ${batchNumber}/${totalBatches} (${batch.length} trips)...`);
      const tripsResult = await convex.mutation(api.dataUpload.uploadTrips, { trips: batch });
      totalTripsUploaded += tripsResult.inserted;
      console.log(`Batch ${batchNumber} uploaded: ${tripsResult.inserted} trips`);
    }
    
    console.log(`Total trips uploaded: ${totalTripsUploaded}`);
    
    // Upload shapes in batches if available
    if (shapes.length > 0) {
      console.log('Uploading shapes in batches...');
      const shapesBatchSize = 100;
      let totalShapesUploaded = 0;
      
      for (let i = 0; i < shapes.length; i += shapesBatchSize) {
        const batch = shapes.slice(i, i + shapesBatchSize);
        const batchNumber = Math.floor(i / shapesBatchSize) + 1;
        const totalBatches = Math.ceil(shapes.length / shapesBatchSize);
        
        console.log(`Uploading shapes batch ${batchNumber}/${totalBatches} (${batch.length} shapes)...`);
        const shapesResult = await convex.mutation(api.dataUpload.uploadShapesBatch, { shapes: batch });
        totalShapesUploaded += shapesResult.inserted;
        console.log(`Batch ${batchNumber} uploaded: ${shapesResult.inserted} shapes`);
      }
      
      console.log(`Total shapes uploaded: ${totalShapesUploaded}`);
    }
    
    // Upload precomputed routes in batches if available
    if (precomputedRoutes.length > 0) {
      console.log('Uploading precomputed routes in batches...');
      const precomputedBatchSize = 50;
      let totalPrecomputedUploaded = 0;
      
      for (let i = 0; i < precomputedRoutes.length; i += precomputedBatchSize) {
        const batch = precomputedRoutes.slice(i, i + precomputedBatchSize);
        const batchNumber = Math.floor(i / precomputedBatchSize) + 1;
        const totalBatches = Math.ceil(precomputedRoutes.length / precomputedBatchSize);
        
        console.log(`Uploading precomputed routes batch ${batchNumber}/${totalBatches} (${batch.length} routes)...`);
        const precomputedResult = await convex.mutation(api.dataUpload.uploadPrecomputedRoutes, { 
          precomputedRoutes: batch 
        });
        totalPrecomputedUploaded += precomputedResult.inserted;
        console.log(`Batch ${batchNumber} uploaded: ${precomputedResult.inserted} precomputed routes`);
      }
      
      console.log(`Total precomputed routes uploaded: ${totalPrecomputedUploaded}`);
    }
    
    console.log('Basic data upload completed successfully!');
    
  } catch (error) {
    console.error('Error uploading data:', error);
  }
}

async function uploadTripsBatch(batchNumber: number, batchSize: number = 8000) {
  console.log('Loading trips data...');
  const dataDir = path.join(__dirname, '../public/data');
  const tripsData = await loadJSONFile(path.join(dataDir, 'trips.json'));
  
  if (!tripsData) {
    console.error('Failed to load trips data');
    return;
  }
  
  console.log('Transforming trips data...');
  const trips = transformTripsData(tripsData);
  
  const startIndex = (batchNumber - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, trips.length);
  const batch = trips.slice(startIndex, endIndex);
  
  if (batch.length === 0) {
    console.log(`Batch ${batchNumber} is empty or out of range`);
    return;
  }
  
  console.log(`Uploading trips batch ${batchNumber}: ${batch.length} trips`);
  
  try {
    const result = await convex.mutation(api.dataUpload.uploadTrips, { trips: batch });
    console.log(`Uploaded ${result.inserted} trips from batch ${batchNumber}`);
  } catch (error) {
    console.error(`Error uploading trips batch ${batchNumber}:`, error);
  }
}

async function uploadShapesBatch(batchNumber: number, batchSize: number = 100) {
  console.log('Loading shapes data...');
  const dataDir = path.join(__dirname, '../public/data');
  const shapesData = await loadJSONFile(path.join(dataDir, 'shapes.json'));
  
  if (!shapesData) {
    console.error('Failed to load shapes data');
    return;
  }
  
  console.log('Transforming shapes data...');
  const shapes = transformShapesData(shapesData);
  
  const startIndex = (batchNumber - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, shapes.length);
  const batch = shapes.slice(startIndex, endIndex);
  
  if (batch.length === 0) {
    console.log(`Batch ${batchNumber} is empty or out of range`);
    return;
  }
  
  console.log(`Uploading shapes batch ${batchNumber}: ${batch.length} shapes`);
  
  try {
    const result = await convex.mutation(api.dataUpload.uploadShapesBatch, { shapes: batch });
    console.log(`Uploaded ${result.inserted} shapes from batch ${batchNumber}`);
  } catch (error) {
    console.error(`Error uploading shapes batch ${batchNumber}:`, error);
  }
}

async function uploadPrecomputedRoutesBatch(batchNumber: number, batchSize: number = 50) {
  console.log('Loading precomputed routes data...');
  const dataDir = path.join(__dirname, '../public/data');
  const routesData = await loadJSONFile(path.join(dataDir, 'routes_precomputed.json'));
  
  if (!routesData) {
    console.error('Failed to load precomputed routes data');
    return;
  }
  
  console.log('Transforming precomputed routes data...');
  const precomputedRoutes = transformPrecomputedRoutesData(routesData);
  
  const startIndex = (batchNumber - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, precomputedRoutes.length);
  const batch = precomputedRoutes.slice(startIndex, endIndex);
  
  if (batch.length === 0) {
    console.log(`Batch ${batchNumber} is empty or out of range`);
    return;
  }
  
  console.log(`Uploading precomputed routes batch ${batchNumber}: ${batch.length} routes`);
  
  try {
    const result = await convex.mutation(api.dataUpload.uploadPrecomputedRoutes, { 
      precomputedRoutes: batch 
    });
    console.log(`Uploaded ${result.inserted} precomputed routes from batch ${batchNumber}`);
  } catch (error) {
    console.error(`Error uploading precomputed routes batch ${batchNumber}:`, error);
  }
}

async function getDataCounts() {
  console.log('Getting data counts...');
  try {
    const counts = await convex.mutation(api.dataUpload.getDataCounts, {});
    console.log('Current data counts:', counts);
  } catch (error) {
    console.error('Error getting data counts:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'basic':
      await uploadBasicData();
      break;
    case 'trips':
      const tripsBatch = parseInt(arg1) || 1;
      const tripsBatchSize = parseInt(arg2) || 8000;
      await uploadTripsBatch(tripsBatch, tripsBatchSize);
      break;
    case 'shapes':
      const shapesBatch = parseInt(arg1) || 1;
      const shapesBatchSize = parseInt(arg2) || 100;
      await uploadShapesBatch(shapesBatch, shapesBatchSize);
      break;
    case 'precomputed':
      const precomputedBatch = parseInt(arg1) || 1;
      const precomputedBatchSize = parseInt(arg2) || 50;
      await uploadPrecomputedRoutesBatch(precomputedBatch, precomputedBatchSize);
      break;
    case 'counts':
      await getDataCounts();
      break;
    default:
      console.log('Usage:');
      console.log('  npx tsx uploadDataToConvex.ts basic                      - Upload all data: stations, routes, trips, shapes, and precomputed routes (all in batches)');
      console.log('  npx tsx uploadDataToConvex.ts trips [batch] [size]       - Upload trips batch (default: batch 1, size 8000)');
      console.log('  npx tsx uploadDataToConvex.ts shapes [batch] [size]      - Upload shapes batch (default: batch 1, size 100)');
      console.log('  npx tsx uploadDataToConvex.ts precomputed [batch] [size] - Upload precomputed routes batch (default: batch 1, size 50)');
      console.log('  npx tsx uploadDataToConvex.ts counts                     - Get current data counts');
      console.log('');
      console.log('Examples:');
      console.log('  npx tsx uploadDataToConvex.ts trips 2 5000               - Upload second batch of 5000 trips');
      console.log('  npx tsx uploadDataToConvex.ts shapes 1 50                - Upload first 50 shapes');
      console.log('  npx tsx uploadDataToConvex.ts precomputed 2 25           - Upload second batch of 25 precomputed routes');
      console.log('Valid table names: stations, routes, trips, shapes, precomputed_routes');
      console.log('Note: With 26,834 trips total, you need about 4 batches of 8000 each');
  }
}

if (require.main === module) {
  main().catch(console.error);
} 