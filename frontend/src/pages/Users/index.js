import {
  Backdrop,
  Button,
  Fade,
  IconButton,
  InputAdornment,
  Modal,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
  AddCircleOutline,
  DeleteOutline,
  Edit,
  Info,
  Search
} from "@material-ui/icons";
import React, { useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import UserModal from "../../components/UserModal";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import openSocket from "../../services/socket-io";

const reducer = (state, action) => {
  if (action.type === "LOAD_USERS") {
    const users = action.payload;
    const newUsers = [];

    users.forEach((user) => {
      const userIndex = state.findIndex((u) => u.id === user.id);
      if (userIndex !== -1) {
        state[userIndex] = user;
      } else {
        newUsers.push(user);
      }
    });

    return [...state, ...newUsers];
  }

  if (action.type === "UPDATE_USERS") {
    const user = action.payload;
    const userIndex = state.findIndex((u) => u.id === user.id);

    if (userIndex !== -1) {
      state[userIndex] = user;
      return [...state];
    } else {
      return [user, ...state];
    }
  }

  if (action.type === "DELETE_USER") {
    const userId = action.payload;

    const userIndex = state.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      state.splice(userIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  modalPaper: {
    backgroundColor: "white",
    padding: theme.spacing(2),
    borderRadius: "8px",
    boxShadow: theme.shadows[5],
    width: "400px",
    maxHeight: "80%",
    overflowY: "auto",
  },
}));

const Users = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [modalTitle, setModalTitle] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [users, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchUsers = async () => {
        try {
          const { data } = await api.get("/users/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_USERS", payload: data.users });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("user", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_USERS", payload: data.user });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_USER", payload: +data.userId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success(t("users.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const handleOpenModal = (content, title) => {
    setModalContent(content);
    setModalTitle(title);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalContent([]);
    setModalOpen(false);
  };

  return (
    <MainContainer>
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        BackdropComponent={Backdrop}
        BackdropProps={{ timeout: 500 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Fade in={modalOpen}>
          <div className={classes.modalPaper}>
            <h2>{modalTitle}</h2>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("users.modalTable.id")}</TableCell>
                  <TableCell>{t("users.modalTable.name")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modalContent.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Fade>
      </Modal>
      <ConfirmationModal
        title={
          deletingUser &&
          `${t("users.confirmationModal.deleteTitle")} ${deletingUser.name
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteUser(deletingUser.id)}
      >
        {t("users.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        aria-labelledby="form-dialog-title"
        userId={selectedUser && selectedUser.id}
      />
      <MainHeader>
        <Title>{t("users.title")} ({users.length})</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="secondary" />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title={t("users.buttons.add")}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenUserModal}
            >
              <AddCircleOutline />
            </Button>
          </Tooltip>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">
                {t("users.table.id")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.name")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.email")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.profile")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.whatsapp")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.queue")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.startWork")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.endWork")}
              </TableCell>
              <TableCell align="center">
                {t("users.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell align="center">{user.id}</TableCell>
                  <TableCell align="center">{user.name}</TableCell>
                  <TableCell align="center">{user.email}</TableCell>
                  <TableCell align="center">{user.profile}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenModal(user.whatsapps, t("users.modalTitle.channel"))}
                    >
                      <Info color="secondary" />
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenModal(user.queues, t("users.modalTitle.queue"))}
                    >
                      <Info color="secondary" />
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">{user.startWork}</TableCell>
                  <TableCell align="center">{user.endWork}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit color="secondary" />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setConfirmModalOpen(true);
                        setDeletingUser(user);
                      }}
                    >
                      <DeleteOutline color="secondary" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={8} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Users;
