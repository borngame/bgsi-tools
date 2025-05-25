// src/pages/CompletionTracker.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Link,
  Button,
  Tab
} from "@mui/material";

import {
  Category,
  Egg,
  Pet,
  PetVariant,
  variants,
  currencyImages
} from "../util/PetUtil";
import {
  getRarityStyle,
  getPercentStyle,
  imgIcon,
} from "../util/StyleUtil";
import { theme } from "..";

const STORAGE_KEY = "petTrackerState";
const drawerWidth = 340;
type PetKey = `${string}__${PetVariant}`;
type OwnedPets = Record<PetKey, boolean>;

interface CompletionTrackerProps {
  data: Category[];
}

export function CompletionTracker({ data }: CompletionTrackerProps) {
  const [ownedPets, setOwnedPets] = useState<OwnedPets>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  const [visibleCount, setVisibleCount] = useState(10);

  // load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOwnedPets(JSON.parse(saved));
    } catch {}
  }, []);

  // scroll to top on category/subcategory change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedCategory]);

  const saveState = (pets: OwnedPets) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
    } catch {}
  };

  const togglePet = (pet: string, variant: PetVariant) => {
    const key: PetKey = `${pet}__${variant}`;
    setOwnedPets((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveState(updated);
      return updated;
    });
  };

  const calculateCompletion = (pets: Pet[]) => {
    const totals: Record<PetVariant, number> = {
      Normal: 0,
      Shiny: 0,
      Mythic: 0,
      "Shiny Mythic": 0
    };
    const owned: Record<PetVariant, number> = { ...totals };

    pets.forEach((pet) =>
      pet.variants.forEach((v) => {
        totals[v]++;
        if (ownedPets[`${pet.name}__${v}`]) owned[v]++;
      })
    );

    const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
    const ownedAll = Object.values(owned).reduce((a, b) => a + b, 0);

    return {
      overall: totalAll ? Math.round((ownedAll / totalAll) * 100) : 0,
      perVariant: Object.fromEntries(
        variants.map((v) => [
          v,
          totals[v] ? Math.round((owned[v] / totals[v]) * 100) : 0
        ])
      ) as Record<PetVariant, number>,
      raw: {
        owned: ownedAll,
        total: totalAll,
        perVariant: { ...owned },
        totals: { ...totals }
      }
    };
  };

  // flatten all eggs
  const allEggs: Egg[] = data.flatMap((cat) => cat.eggs);
  const allStats = calculateCompletion(allEggs.flatMap((e) => e.pets));

  // determine subcategories/eggs to show
  const isAll = selectedCategory === "All";
  const categoryData = isAll ? null : data.find((cat) => cat.name === selectedCategory)!;

  // eggs to show in main content
  const eggsToShow: Egg[] = categoryData ? categoryData.eggs : allEggs;

  const headerName = categoryData ? categoryData.name : "All Pets";
  const headerStats = calculateCompletion(eggsToShow.flatMap((e) => e.pets));

  // infinite‐scroll effect
  useEffect(() => {
    const handleScroll = () => {
      // how close to the bottom before loading more (px)
      const threshold = 150;
      const scrolledToBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - threshold;
    
      if (scrolledToBottom && visibleCount < eggsToShow.length) {
        setVisibleCount((c) => Math.min(c + 10, eggsToShow.length));
      }
    };
  
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, eggsToShow]);

  return (
    <Box sx={{ display: "flex", flexGrow: 1 }}>
      {/* Left drawer */}
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            mt: 8,
            // make its height fill the rest of the screen
            height: `calc(100% - ${theme.mixins.toolbar.minHeight}px)`,
            overflowY: "auto",
          }
        }}
      >
        <List disablePadding>
          {/* "All" */}
          <ListItemButton
            selected={isAll}
            onClick={() => {
              setSelectedCategory("All");
            }}
          >
            <ListItemText
              primary={`All (${allStats.overall}%)`}
            />
          </ListItemButton>

          {/* Categories */}
          {data.map((cat) => {
            const catStats = calculateCompletion(cat.eggs.flatMap((e) => e.pets));
            const catSelected = selectedCategory === cat.name;
            return (
              <Box key={cat.name}>
                <ListItemButton
                  selected={catSelected}
                  onClick={() => {
                    if (catSelected) {
                      setSelectedCategory("All");
                    } else {
                      setSelectedCategory(cat.name);
                    }
                  }}
                >
                  <ListItemIcon>
                    <Avatar src={cat.image} variant="square" sx={{ width: 24, height: 24 }} />
                  </ListItemIcon>
                  <ListItemText>
                    <Typography sx={{ fontWeight: "bold" }}>
                      {cat.name} ({catStats.overall}%)
                    </Typography>
                  </ListItemText>
                </ListItemButton>
                {
                  catSelected && cat.eggs.length > 1 && (
                    cat.eggs.map((egg) => {
                      const id = egg.name.replace(/\s+/g, "_");
                      const eggStats = calculateCompletion(
                        egg.pets
                      );
                      return (
                        <ListItemButton key={egg.name} component="a" href={`#${id}`} sx={{ pl: 4, backgroundColor: '#222' }} >
                          <ListItemIcon>
                            <Avatar src={egg.image} variant="square" sx={{ width: 24, height: 24 }} />
                          </ListItemIcon>
                          <ListItemText primary={egg.name} />
                            <Typography sx={{ ...getPercentStyle(eggStats.overall) }} >
                              ({eggStats.overall}%)
                            </Typography>
                        </ListItemButton>
                      );
                    })
                  )
                }
              </Box>
            );
          })}
          <Box sx={{ height: '50px' }} />
        </List>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 1, mx: "auto", maxWidth: "1000px" }} >
        {/* Header */}
        <Typography variant="h4" gutterBottom>
          {headerName}:{" "}
          <span style={getPercentStyle(headerStats.overall)}>
            {headerStats.raw.owned} / {headerStats.raw.total} (
            {headerStats.overall}%)
          </span>
        </Typography>

        {/* Variant stats */}
        <Paper sx={{ p: 2, mb: 4, width: "fit-content" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {variants.map((v) => (
                  <TableCell key={v}>
                    <b>{v}</b>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                {variants.map((v) => (
                  <TableCell
                    key={v}
                    sx={getPercentStyle(headerStats.perVariant[v])}
                  >
                    {headerStats.raw.perVariant[v]} /{" "}
                    {headerStats.raw.totals[v]} (
                    {headerStats.perVariant[v]}%)
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </Paper>

        {/* Eggs list */}
        {eggsToShow.slice(0, visibleCount).map((egg) => {
          const stats = calculateCompletion(egg.pets);
          const id = egg.name.replace(/\s+/g, "_");
          return (
            <Box key={egg.name} id={id} sx={{ mb: 6, scrollMarginTop: "80px" }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar
                  src={egg.image}
                  variant="square"
                  sx={{ width: 32, height: 32, mr: 1 }}
                />
                <Typography variant="h6">
                  <b>{egg.name}</b>:{" "}
                  <span style={getPercentStyle(stats.overall)}>
                    {stats.raw.owned} / {stats.raw.total} ({stats.overall}
                    %)
                  </span>
                  { !egg.available && (
                    <span style={{ color: "#666", fontSize: "0.8em" }}>
                      {" "}
                      (Discontinued)
                    </span>
                  )}
                </Typography>
              </Box>
              <Paper sx={{ p: 1 }} elevation={2}>
                <Table size="small" sx={{ "& .MuiTableCell-root": { p: 0.5 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 24 }} />
                      <TableCell sx={{ width: 150, fontWeight: "bold" }}>
                        Pet
                      </TableCell>
                      <TableCell sx={{ width: 150, fontWeight: "bold" }}>
                        Drop Rate
                      </TableCell>
                      {/* <TableCell sx={{ width: 100, textAlign: "center" }}>
                        {imgIcon("https://static.wikia.nocookie.net/bgs-infinity/images/0/0c/Bubbles.png")}
                      </TableCell>
                      <TableCell sx={{ width: 100, textAlign: "center" }}>
                        💰
                      </TableCell>
                      <TableCell sx={{ width: 100, textAlign: "center" }}>
                        {imgIcon("https://static.wikia.nocookie.net/bgs-infinity/images/d/d5/Gems.png")}
                      </TableCell> */}
                      {variants.map((v) => (
                        <TableCell
                          key={v}
                          sx={{ width: 100, fontWeight: "bold", textAlign: "left" }}
                        >
                          {v}
                        </TableCell>
                      ))}
                      {/* Egg image column */}
                      <TableCell sx={{ width: 24 }} />
                      <TableCell sx={{ width: 150, fontWeight: "bold" }}>
                          Source
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {egg.pets.map((pet) => {
                      const style = getRarityStyle(pet.rarity);
                      return (
                        <TableRow key={pet.name}>
                          <TableCell>
                            <Link
                              href={`https://bgs-infinity.fandom.com/wiki/${pet.name}`}
                              target="_blank"
                            >
                              <Avatar
                                src={pet.image[0]}
                                variant="square"
                                sx={{ width: 24, height: 24 }}
                              />
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`https://bgs-infinity.fandom.com/wiki/${pet.name}`}
                              target="_blank"
                              sx={{ textDecoration: "none" }}
                            >
                              <Typography variant="body2" sx={style}>
                                {pet.name}
                              </Typography>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={style}>
                              { /* If drop rate below 100, show as percent. */
                                pet.droprate < 100 ? 
                                (<>{Number(100 / pet.droprate).toLocaleString(undefined, { maximumFractionDigits: 2 })}%</>) 
                                : 
                                (<>1/{Number(pet.droprate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</>)
                              }
                            </Typography>
                          </TableCell>
                          {/* <TableCell sx={{ textAlign: "center" }}>
                            {imgIcon("https://static.wikia.nocookie.net/bgs-infinity/images/0/0c/Bubbles.png")} +{pet.bubbles}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center" }}>
                            {imgIcon(currencyImages[pet.currencyVariant])} x{pet.currency}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center" }}>
                            {imgIcon("https://static.wikia.nocookie.net/bgs-infinity/images/d/d5/Gems.png")} x{pet.gems}
                          </TableCell> */}
                          {variants.map((v) => (
                            <TableCell key={v}>
                              {pet.variants.includes(v) && (
                                <Checkbox
                                  size="small"
                                  checked={!!ownedPets[`${pet.name}__${v}`]}
                                  onChange={() => togglePet(pet.name, v)}
                                />
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Avatar
                              src={pet.obtainedFromImage}
                              alt={pet.obtainedFrom}
                              sx={{ width: 24, height: 24 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {pet.obtainedFrom}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
