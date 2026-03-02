CREATE TABLE forest_plots (
                              id VARCHAR PRIMARY KEY,
                              code_region VARCHAR(10),
                              code_departement VARCHAR(10),
                              code_commune VARCHAR(10),
                              lieu_dit VARCHAR(255),
                              geom GEOMETRY(MultiPolygon, 4326),  -- ← MultiPolygon!
                              essences VARCHAR(100)[],
                              surface_hectares DOUBLE PRECISION,
                              type_foret VARCHAR(100)
);