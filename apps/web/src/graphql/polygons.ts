// graphql/polygons.ts
import { gql } from '@apollo/client';

const POLYGON_FIELDS = `
  id
  folderId
  rootOrder
  folderOrder
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
  locationContext
`;

export const GET_MY_POLYGON_FOLDERS = gql`
  query MyPolygonFolders {
    myPolygonFolders {
      id
      name
      rootOrder
      createdAt
    }
  }
`;

export const SAVE_POLYGON_MUTATION = gql`
  mutation SavePolygon($input: SavePolygonInput!) {
    savePolygon(input: $input) {
      ${POLYGON_FIELDS}
    }
  }
`;

export const GET_MY_POLYGONS = gql`
  query MyPolygons {
    myPolygons {
      ${POLYGON_FIELDS}
    }
  }
`;

export const DELETE_POLYGON_MUTATION = gql`
  mutation DeletePolygon($polygonId: ID!) {
    deletePolygon(polygonId: $polygonId)
  }
`;

export const REANALYZE_POLYGON_MUTATION = gql`
  mutation ReanalyzePolygon($polygonId: ID!) {
    reanalyzePolygon(polygonId: $polygonId) {
      ${POLYGON_FIELDS}
    }
  }
`;

export const CREATE_POLYGON_FOLDER = gql`
  mutation CreatePolygonFolder($input: CreatePolygonFolderInput!) {
    createPolygonFolder(input: $input) {
      id
      name
      rootOrder
      createdAt
    }
  }
`;

export const RENAME_POLYGON_FOLDER = gql`
  mutation RenamePolygonFolder($input: RenamePolygonFolderInput!) {
    renamePolygonFolder(input: $input) {
      id
      name
      rootOrder
      createdAt
    }
  }
`;

export const DELETE_POLYGON_FOLDER = gql`
  mutation DeletePolygonFolder($folderId: ID!) {
    deletePolygonFolder(folderId: $folderId)
  }
`;

export const UPDATE_POLYGON_MUTATION = gql`
  mutation UpdatePolygon($input: UpdatePolygonInput!) {
    updatePolygon(input: $input) {
      ${POLYGON_FIELDS}
    }
  }
`;

export const MOVE_POLYGON_TO_FOLDER = gql`
  mutation MovePolygonToFolder($polygonId: ID!, $folderId: ID) {
    movePolygonToFolder(polygonId: $polygonId, folderId: $folderId) {
      ${POLYGON_FIELDS}
    }
  }
`;

export const REORDER_ROOT_LIBRARY = gql`
  mutation ReorderRootLibrary($input: ReorderRootLibraryInput!) {
    reorderRootLibrary(input: $input)
  }
`;

export const REORDER_POLYGONS_IN_FOLDER = gql`
  mutation ReorderPolygonsInFolder($folderId: ID!, $polygonIds: [ID!]!) {
    reorderPolygonsInFolder(folderId: $folderId, polygonIds: $polygonIds)
  }
`;
