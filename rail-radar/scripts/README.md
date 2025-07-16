# Data Upload Scripts

This directory contains scripts to upload the transit data from `public/data/` to your Convex database.

## Files

- `uploadData.js` - Node.js script that transforms data and saves it to files for manual upload
- `uploadDataToConvex.ts` - TypeScript script that directly uploads data to Convex using the mutations

## Prerequisites

1. Make sure your Convex deployment is running
2. Set your `CONVEX_URL` environment variable or update it in the script
3. Install dependencies: `npm install` or `yarn install`

## Usage

### Method 1: Direct Upload (Recommended)

Use the TypeScript script to upload data directly to Convex:

```bash
# Set your Convex URL
export CONVEX_URL="https://your-deployment.convex.cloud"

# Upload basic data (stations, routes, trips)
npx tsx scripts/uploadDataToConvex.ts basic

# Check current data counts
npx tsx scripts/uploadDataToConvex.ts counts

# Upload shapes in batches (due to large size)
npx tsx scripts/uploadDataToConvex.ts shapes 1 100    # First batch of 100 shapes
npx tsx scripts/uploadDataToConvex.ts shapes 2 100    # Second batch of 100 shapes
# Continue until all shapes are uploaded...

# Upload precomputed routes in batches
npx tsx scripts/uploadDataToConvex.ts precomputed 1 50    # First batch of 50 routes
npx tsx scripts/uploadDataToConvex.ts precomputed 2 50    # Second batch of 50 routes
# Continue until all precomputed routes are uploaded...

# Clear all data (if needed)
npx tsx scripts/uploadDataToConvex.ts clear
```

### Method 2: Manual Upload

Use the Node.js script to transform data and save it to files, then upload manually:

```bash
# Transform basic data
node scripts/uploadData.js basic

# Process shapes in batches
node scripts/uploadData.js shapes

# Process precomputed routes in batches
node scripts/uploadData.js precomputed
```

This will create transformed JSON files in the `scripts/` directory that you can then upload using your Convex dashboard or client.

## Data Sizes and Batching

The JSON files have different sizes:
- `routes.json`: ~2.7KB (small, upload all at once)
- `stops.json`: ~92KB (medium, upload all at once)
- `trips.json`: ~4.1MB (large, upload all at once but might take time)
- `shapes.json`: ~133MB (very large, **must upload in batches**)
- `routes_precomputed.json`: ~251MB (very large, **must upload in batches**)

### Recommended Batch Sizes

- **Shapes**: 50-100 shapes per batch
- **Precomputed Routes**: 25-50 routes per batch

## Convex Mutations

The following mutations are available in `convex/dataUpload.ts`:

- `uploadStations` - Upload station data
- `uploadRoutes` - Upload route data
- `uploadTrips` - Upload trip data
- `uploadShapesBatch` - Upload shapes in batches
- `uploadPrecomputedRoutes` - Upload precomputed routes in batches
- `clearAllData` - Clear all data from all tables
- `getDataCounts` - Get current record counts for all tables

## Error Handling

If uploads fail:
1. Check your Convex URL is correct
2. Ensure your Convex deployment is running
3. Try smaller batch sizes for large files
4. Check Convex logs for detailed error messages

## Data Schema

The data is uploaded to these Convex tables:
- `stations` - Station information with platforms
- `routes` - Route definitions
- `trips` - Trip information
- `shapes` - Route shape coordinates (grouped by shape_id)
- `precomputed_routes` - Precomputed route calculations

## Example Workflow

```bash
# 1. Start with basic data
npx tsx scripts/uploadDataToConvex.ts basic

# 2. Check that data was uploaded
npx tsx scripts/uploadDataToConvex.ts counts

# 3. Upload shapes (estimate how many batches you need)
# For 133MB of shapes data, you might need 50-100 batches
for i in {1..50}; do
  npx tsx scripts/uploadDataToConvex.ts shapes $i 100
done

# 4. Upload precomputed routes
# For 251MB of precomputed routes, you might need 100-200 batches
for i in {1..100}; do
  npx tsx scripts/uploadDataToConvex.ts precomputed $i 50
done

# 5. Final check
npx tsx scripts/uploadDataToConvex.ts counts
```

## Troubleshooting

- **TypeScript errors**: Make sure you have `tsx` installed: `npm install -g tsx`
- **Module errors**: Run `npm install` to install dependencies
- **Convex connection errors**: Check your `CONVEX_URL` environment variable
- **Out of memory errors**: Reduce batch sizes for large files 