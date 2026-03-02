// graphql/polygons.ts
import { gql } from '@apollo/client';

export const SAVE_POLYGON_MUTATION = gql`
  mutation SavePolygon($input: SavePolygonInput!) {
    savePolygon(input: $input) {
      id
      name
      areaHectares
      status
      createdAt
  # geometry
      analysisResults {
        plotCount
        totalForestArea
        coveragePercentage
        forestTypes
        speciesDistribution {
          species
          areaHectares
          percentage
        }
      }
    }
  }
`;

export const GET_MY_POLYGONS = gql`
  query MyPolygons {
    myPolygons {
      id
      name
      areaHectares
      status
      createdAt
      geometry
      analysisResults {
        plotCount
        totalForestArea
        coveragePercentage
        forestTypes
        speciesDistribution {
          species
          areaHectares
          percentage
        }
      }
    }
  }
`;

export const DELETE_POLYGON_MUTATION = gql`
  mutation DeletePolygon($polygonId: String!) {
    deletePolygon(polygonId: $polygonId)
  }
`;

export const REANALYZE_POLYGON_MUTATION = gql`
  mutation ReanalyzePolygon($polygonId: String!) {
    reanalyzePolygon(polygonId: $polygonId) {
      id
      name
      areaHectares
      status
      createdAt
      analysisResults {
        plotCount
        totalForestArea
        coveragePercentage
        forestTypes
        speciesDistribution {
          species
          areaHectares
          percentage
        }
      }
    }
  }
`;