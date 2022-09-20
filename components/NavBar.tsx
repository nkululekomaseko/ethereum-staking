import React from "react";
import { AppBar, Box, Toolbar, Button, Typography } from "@mui/material";

type Props = {
  isConnected: boolean;
  handleConnectClick: () => void | Promise<void>;
};

const NavBar = (props: Props) => {
  return (
    <>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography sx={{ flexGrow: 1 }}>Ether Staking</Typography>
            <Button color="inherit" onClick={props.handleConnectClick}>
              {props.isConnected ? "Connected" : "Connect Wallet"}
            </Button>
          </Toolbar>
        </AppBar>
      </Box>
    </>
  );
};

export default NavBar;
