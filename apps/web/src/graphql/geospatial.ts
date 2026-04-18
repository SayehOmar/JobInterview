import { gql } from '@apollo/client';

export type RegionsQueryData = { regions: string[] };
export type DepartementsQueryData = { departements: string[] };
export type DepartementsQueryVariables = { regionCode: string };
export type CommunesQueryData = { communes: string[] };
export type CommunesQueryVariables = { departementCode: string };

export const GET_REGIONS = gql`
  query Regions {
    regions
  }
`;

export const GET_DEPARTEMENTS = gql`
  query Departements($regionCode: String!) {
    departements(regionCode: $regionCode)
  }
`;

export const GET_COMMUNES = gql`
  query Communes($departementCode: String!) {
    communes(departementCode: $departementCode)
  }
`;

export const GET_LIEUX_DITS = gql`
  query LieuxDits($communeCode: String!) {
    lieuxDits(communeCode: $communeCode)
  }
`;

export const GET_FOREST_PLOTS = gql`
  query ForestPlots($filters: ForestPlotsFilterInput) {
    forestPlots(filters: $filters) {
      id
      codeRegion
      codeDepartement
      codeCommune
      lieuDit
      geometry
      essences
      surfaceHectares
      typeForet
    }
  }
`;

export const ANALYZE_POLYGON = gql`
  mutation AnalyzePolygon($polygon: PolygonInput!) {
    analyzePolygon(polygon: $polygon) {
      totalAreaHectares
      parcelCount
      essencesDistribution {
        essence
        areaHectares
        percentage
      }
    }
  }
`;