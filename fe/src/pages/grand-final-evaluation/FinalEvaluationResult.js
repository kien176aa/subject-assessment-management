import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridCellEditStopReasons,
  GridToolbar,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import TextField from "@mui/material/TextField";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Col,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
  Row,
  RSelect,
} from "../../components/Component";
import { convertToOptions, generateTemplateAllMileEval, getValueByLabel, isNullOrEmpty } from "../../utils/Utils";
import { DropdownItem, DropdownMenu, DropdownToggle, Input, Spinner, Table, UncontrolledDropdown } from "reactstrap";
import authApi from "../../utils/ApiAuth";
import { toast, ToastContainer } from "react-toastify";
import AddCommentIcon from "@mui/icons-material/AddComment";
import CommentIcon from "@mui/icons-material/Comment";
import { Popover, TextareaAutosize, Tooltip } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import useAuthStore from "../../store/Userstore";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

const centeredHeaderStyle = {
  "& .MuiDataGrid-columnHeaderTitle": {
    display: "flex",
    justifyContent: "center",
  },
};

function CustomToolbar({ rows, columns, columnsGroups, evaluations }) {
  const [loadings, setLoadings] = React.useState({
    export: false,
  });
  const exportEval = async () => {
    try {
      await generateTemplateAllMileEval(rows, columns, columnsGroups, evaluations);
    } catch (error) {
      console.log("err export:", error);
      toast.error(`Fail to export evaluation!`, {
        position: toast.POSITION.TOP_CENTER,
      });
    } finally {
      setLoadings((prev) => ({
        ...prev,
        export: false,
      }));
    }
  };
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <div
        style={{
          color: "#1976d2",
          fontSize: "0.8125rem",
          fontWeight: "500",
          cursor: "pointer",
        }}
        onClick={() => {
          setLoadings((prev) => ({
            ...prev,
            export: true,
          }));
          exportEval();
        }}
      >
        {loadings.export ? (
          <Spinner />
        ) : (
          <>
            <FileDownloadIcon /> EXPORT
          </>
        )}
      </div>
    </GridToolbarContainer>
  );
}

const columns = (evaluations) => [
  { field: "id", headerName: "", width: 70, checkboxSelection: true },
  { field: "classCode", headerName: "Class Code", width: 150 },
  { field: "sessionName", headerName: "Session", width: 150 },
  { field: "teamName", headerName: "Team", width: 150 },
  { field: "status", headerName: "Status", width: 150 },
  { field: "fullname", headerName: "Student", width: 200 },
  { field: "avgGrade", headerName: "Gr", width: 100 },
  ...(evaluations[0]?.gradeEvaluators || [])
    .map((_, idx) => [
      { field: `evaluator${idx}`, headerName: `Evaluator ${idx + 1}`, width: 200 },
      { field: `grade${idx}`, headerName: `GR ${idx + 1}`, width: 100 },
    ])
    .flat(),
];

const rows = (evaluations) =>
  evaluations.map((item, index) => {
    const gradeEvaluatorFields = item.gradeEvaluators.reduce(
      (acc, curr, idx) => ({
        ...acc,
        [`evaluator${idx}`]: curr.fullname,
        [`grade${idx}`]: curr.grade,
      }),
      {}
    );

    return {
      id: index,
      milestoneId: item.milestoneId,
      councilTeamId: item.councilTeamId,
      studentId: item.studentId,
      classCode: item.classCode,
      sessionName: item.sessionName,
      teamName: item.teamName,
      status: item.status,
      fullname: item.fullname,
      avgGrade: item.avgGrade,
      ...gradeEvaluatorFields,
    };
  });

export default function FinalEvaluationResult() {
  const [columnVisibilityModel, setColumnVisibilityModel] = React.useState({
    id: false,
  });
  const [evaluations, setEvaluations] = React.useState([]);
  const [isFetching, setIsFetching] = React.useState({
    semester: true,
    subject: true,
    round: true,
    class: true,
    team: true,
    studentEval: true,
    rejected: false,
  });

  const [filterForm, setFilterForm] = useState({
    semester: null,
    subject: null,
    class: null,
    milestone: null,
    team: null,
    session: null,
    round: null,
  });
  const { role } = useAuthStore((state) => state);
  const { user } = useAuthStore((state) => state);
  const [semesters, setSemesters] = React.useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [teams, setTeams] = useState([]);
  const [workEvaluation, setWorkEvaluation] = useState([]);
  const [milestoneEvaluations, setMilestoneEvaluations] = useState([]);
  const [complexity, setComplexity] = useState([]);
  const [quality, setQuality] = useState([]);
  const [evaluators, setEvaluators] = useState([]);
  const [typeEvaluator, setTypeEvaluator] = useState([]);
  const [mileActive, setMileActive] = useState(-1);
  const [sessions, setSessions] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [isFirst, setIsFirst] = useState(true);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setIsFetching({ ...isFetching, semester: true });
        const response = await authApi.post("/setting/search", {
          pageSize: 9999,
          pageIndex: 1,
          type: "Semester",
          active: true,
          sortBy: "displayOrder",
          orderBy: "ASC",
        });
        console.log("semester:", response.data.data);
        if (response.data.statusCode === 200) {
          setSemesters(convertToOptions(response.data.data.settingDTOS, "id", "name"));
          if (response.data.data.totalElements > 0) {
            setFilterForm({
              ...filterForm,
              semester: {
                value: response.data.data.settingDTOS[0]?.id,
                label: response.data.data.settingDTOS[0]?.name,
              },
            });
          }
        } else {
          toast.error(`${response.data.data}`, {
            position: toast.POSITION.TOP_CENTER,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error search setting!", {
          position: toast.POSITION.TOP_CENTER,
        });
      } finally {
        setIsFetching({ ...isFetching, semester: false });
      }
    };
    fetchSemesters();
  }, []);
  useEffect(() => {
    const fetchSubjects = async () => {
      if (isFetching.semester) {
        return false;
      }
      try {
        setIsFetching({ ...isFetching, subject: true });
        const response = await authApi.post("/subjects/search", {
          pageSize: 9999,
          pageIndex: 1,
          active: true,
        });
        console.log("subject:", response.data.data);
        if (response.data.statusCode === 200) {
          setSubjects(convertToOptions(response.data.data.subjects, "id", "subjectCode"));
          if (response.data.data.totalElements > 0)
            setFilterForm({
              ...filterForm,
              subject: {
                value: response.data.data.subjects[0]?.id,
                label: response.data.data.subjects[0]?.subjectCode,
              },
            });
        } else {
          toast.error(`${response.data.data}`, {
            position: toast.POSITION.TOP_CENTER,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error search subject!", {
          position: toast.POSITION.TOP_CENTER,
        });
      } finally {
        setIsFetching({ ...isFetching, subject: false });
      }
    };
    fetchSubjects();
  }, [isFetching.semester]);

  const fetchRounds = async () => {
    try {
      if (!filterForm?.subject?.value) {
        setRounds([]);
        setIsFetching({ ...isFetching, round: false });
        return;
      }
      setIsFetching({ ...isFetching, round: true });
      const response = await authApi.post("/setting/search", {
        pageSize: 9999,
        pageIndex: 1,
        type: "Round",
        active: true,
        sortBy: "displayOrder",
        orderBy: "ASC",
        isSubjectSetting: true,
        subjectId: filterForm?.subject?.value,
      });
      console.log("round:", response.data.data);
      if (response.data.statusCode === 200) {
        let rounds = convertToOptions(response.data.data.settingDTOS, "id", "name");
        setRounds(rounds);
        if (response.data.data.totalElements > 0) {
          let selectedRound = {
            value: rounds[0]?.value,
            label: rounds[0]?.label,
          };
          setFilterForm({
            ...filterForm,
            round: selectedRound,
          });
        } else {
          setFilterForm({
            ...filterForm,
            round: null,
          });
        }
      } else {
        toast.error(`${response.data.data}`, {
          position: toast.POSITION.TOP_CENTER,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error search round!", {
        position: toast.POSITION.TOP_CENTER,
      });
    } finally {
      setIsFetching({ ...isFetching, round: false });
    }
  };

  const fetchClasses = async () => {
    if (!filterForm?.round?.value || !filterForm?.semester?.value) {
      setClasses([]);
      setFilterForm({ ...filterForm, class: null });
      setIsFetching({ ...isFetching, class: false });
      return false;
    }
    try {
      setIsFetching({ ...isFetching, class: true });
      const response = await authApi.post("/class/search-for-grand-final", {
        roundId: filterForm?.round?.value,
        semesterId: filterForm?.semester?.value,
      });
      console.log("class:", response.data.data);
      if (response.data.statusCode === 200) {
        let classList = response.data.data.classList;
        setClasses(convertToOptions(classList, "id", "name"));
        if (classList.length > 0) {
          setFilterForm({
            ...filterForm,
            class: {
              value: classList[0]?.id,
              label: classList[0]?.name,
            },
          });
          setEvaluators(classList);
        } else {
          setFilterForm({
            ...filterForm,
            class: null,
          });
        }
      } else {
        toast.error(`${response.data.data}`, {
          position: toast.POSITION.TOP_CENTER,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error search class!", {
        position: toast.POSITION.TOP_CENTER,
      });
    } finally {
      setIsFetching({ ...isFetching, class: false });
    }
  };

  const fetchTeams = async () => {
    if (!filterForm?.class?.value || !filterForm?.round?.value || !filterForm?.semester?.value) {
      setTeams([]);
      setFilterForm({ ...filterForm, team: null });
      setIsFetching((prev) => ({ ...prev, team: false }));
      return;
    }
    try {
      setIsFetching((prev) => ({ ...prev, team: true }));
      const response = await authApi.post("/teams/search-for-grand-final", {
        classId: filterForm?.class?.value,
        roundId: filterForm?.round?.value,
        semesterId: filterForm?.semester?.value,
      });
      console.log("teams:", response.data.data);
      if (response.data.statusCode === 200) {
        let teamOptions = convertToOptions(response.data.data.classList, "id", "name");
        setCanEdit(response.data.data.canEvaluate);
        setTeams(teamOptions);
        if (teamOptions.length > 0) {
          setFilterForm({
            ...filterForm,
            team: {
              value: teamOptions[0].value,
              label: teamOptions[0].label,
            },
          });
        } else {
          setFilterForm({ ...filterForm, team: null });
        }
      } else {
        toast.error(`${response.data.data}`, { position: toast.POSITION.TOP_CENTER });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error search teams!", { position: toast.POSITION.TOP_CENTER });
    } finally {
      setIsFetching((prev) => ({ ...prev, team: false }));
    }
  };

  const fetchEvaluations = async () => {
    if (!filterForm?.team?.value || !filterForm.semester?.value || !filterForm.round?.value) {
      setEvaluations([]);
      setIsFetching({ ...isFetching, studentEval: false });
      setIsFirst(false);
      return;
    }
    try {
      setIsFetching({ ...isFetching, studentEval: true });
      const response = await authApi.post("/evaluation/search-total-eval-for-grand-final", {
        semesterId: filterForm?.semester?.value,
        teamId: filterForm?.team?.value,
        roundId: filterForm?.round?.value,
      });
      console.log("evaluations:", response.data.data);
      if (response.data.statusCode === 200) {
        setEvaluations(response.data.data);
      } else {
        toast.error(`${response.data.data}`, { position: toast.POSITION.TOP_CENTER });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error search evaluations!", { position: toast.POSITION.TOP_CENTER });
    } finally {
      setIsFirst(false);
      setIsFetching({ ...isFetching, studentEval: false });
    }
  };

  //load first
  useEffect(() => {
    if (isFirst && !isFetching?.subject) {
      fetchRounds();
    }
  }, [isFetching?.subject]);

  useEffect(() => {
    if (isFirst && !isFetching?.round && !isFetching?.semester) {
      fetchClasses();
    }
  }, [isFetching?.round, isFetching?.semester]);

  useEffect(() => {
    if (isFirst && !isFetching?.class && !isFetching?.round) {
      fetchTeams();
    }
  }, [isFetching?.class, isFetching?.round]);

  useEffect(() => {
    if (isFirst && !isFetching?.team) {
      fetchEvaluations();
    }
  }, [isFetching?.team]);
  //-----------------------

  // load when select change
  useEffect(() => {
    if (!isFirst && !isFetching?.semester && !isFetching?.round) {
      fetchClasses();
    }
  }, [filterForm?.semester?.value, filterForm?.round?.value]);

  useEffect(() => {
    if (!isFirst && !isFetching?.subject) {
      fetchRounds();
    }
  }, [filterForm?.subject?.value]);

  useEffect(() => {
    if (!isFirst && !isFetching?.class && !isFetching?.round) {
      fetchTeams();
    }
  }, [filterForm?.class?.value, filterForm?.round?.value]);

  useEffect(() => {
    if (!isFirst && !isFetching?.team && !isFetching?.class) {
      fetchEvaluations();
    }
  }, [filterForm?.team?.value, isFetching?.team]);
  //------------------------------------------

  const [selectedRows, setSelectedRows] = useState([]);
  const [rowSelectionModel, setRowSelectionModel] = React.useState([]);
  const handleRowSelectionModelChange = (newRowSelectionModel) => {
    setRowSelectionModel(newRowSelectionModel);
    setSelectedRows(newRowSelectionModel);
  };
  const handleReject = () => {
    if (selectedRows.length === 0) {
      toast.error("Please select at least one student!", {
        position: toast.POSITION.TOP_CENTER,
      });
      return;
    }
    Swal.fire({
      title: "Are you sure?",
      text: `Are you sure you want to reject evaluations of those students?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, reject it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setIsFetching({ ...isFetching, rejected: true });
          const rowsToReject = evaluations.filter((evaluation, index) => selectedRows.includes(index));
          const response = await authApi.put("/evaluation/update-status", {
            milestoneId: rowsToReject[0].milestoneId,
            studentIds: rowsToReject.map((item) => item.studentId),
            councilTeamId: rowsToReject[0].councilTeamId,
            status: "Reject",
          });
          console.log("reject: ", response.data);
          if (response.data.statusCode === 200) {
            const updatedEvaluations = evaluations.map((evaluation, index) => {
              if (selectedRows.includes(index)) {
                return {
                  ...evaluation,
                  status: "Reject",
                };
              }
              return evaluation;
            });
            setEvaluations(updatedEvaluations);
            setSelectedRows([]);
            toast.success("Reject successfully", {
              position: toast.POSITION.TOP_CENTER,
            });
          } else {
            toast.error(`${response.data.data}`, {
              position: toast.POSITION.TOP_CENTER,
            });
          }
        } catch (error) {
          console.error("Error reject evaluation:", error);
          toast.error("Error reject evaluation!", {
            position: toast.POSITION.TOP_CENTER,
          });
        } finally {
          setIsFetching({ ...isFetching, rejected: false });
        }
      }
    });
  };

  const handleExport = () => {
    if (evaluations.length === 0) {
      toast.error("No data available to export!", {
        position: toast.POSITION.TOP_CENTER,
      });
      return;
    }

    const exportData = rows(evaluations).map((row) => {
      const exportRow = {};

      columns(evaluations).forEach((column) => {
        exportRow[column.headerName] = row[column.field];
      });

      return exportRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Final Evaluation Results");
    XLSX.writeFile(wb, "final_evaluation_results.xlsx");
  };

  return (
    <>
      <Head title="Submission List" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page> Final Evaluation Results</BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent></BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <Row>
            <Col md={2}>
              <div className="form-group">
                <label className="overline-title overline-title-alt">Semester</label>
                {isFetching?.semester ? (
                  <div>
                    <Spinner />
                  </div>
                ) : (
                  <RSelect
                    options={semesters}
                    value={filterForm.semester}
                    onChange={(e) => {
                      setFilterForm({ ...filterForm, semester: e });
                    }}
                    placeholder="Any Semester"
                  />
                )}
              </div>
            </Col>
            <Col md={2}>
              <div className="form-group">
                <label className="overline-title overline-title-alt">Subject</label>
                {isFetching?.subject ? (
                  <div>
                    <Spinner />
                  </div>
                ) : (
                  <RSelect
                    options={subjects}
                    value={filterForm.subject}
                    onChange={(e) => {
                      setFilterForm({ ...filterForm, subject: e });
                    }}
                    placeholder="Any subject"
                  />
                )}
              </div>
            </Col>
            <Col md={2}>
              <div className="form-group">
                <label className="overline-title overline-title-alt">Round</label>
                {isFetching?.round ? (
                  <div>
                    <Spinner />
                  </div>
                ) : (
                  <RSelect
                    options={rounds}
                    value={filterForm.round}
                    onChange={(e) => {
                      setFilterForm({ ...filterForm, round: e });
                    }}
                    placeholder="Any round"
                  />
                )}
              </div>
            </Col>
            <Col md={3}>
              <div className="form-group">
                <label className="overline-title overline-title-alt">Class</label>
                {isFetching?.class ? (
                  <div>
                    <Spinner />
                  </div>
                ) : (
                  <RSelect
                    options={classes}
                    value={filterForm.class}
                    onChange={(e) => {
                      setFilterForm({ ...filterForm, class: e });
                    }}
                    placeholder="Any class"
                  />
                )}
              </div>
            </Col>
            <Col md={3}>
              <div className="form-group">
                <label className="overline-title overline-title-alt">Team</label>
                {isFetching?.team ? (
                  <div>
                    <Spinner />
                  </div>
                ) : (
                  <RSelect
                    options={teams}
                    value={filterForm.team}
                    onChange={(e) => {
                      setFilterForm({ ...filterForm, team: e });
                    }}
                    placeholder="Any team"
                  />
                )}
              </div>
            </Col>
          </Row>
          {evaluations && evaluations.length > 0 && (
            <Row>
              <div className="text-end mt-4 mb-2">
                <Button className="btn btn-primary me-3" onClick={handleExport}>
                  Export
                </Button>
                {(role === "TEACHER") && (
                  <>
                    {isFetching?.rejected ? (
                      <Button disabled color="danger">
                        <Spinner size="sm" />
                        <span> Rejecting... </span>
                      </Button>
                    ) : (
                      <Button className="btn btn-danger me-3" onClick={handleReject}>
                        Reject
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Row>
          )}
        </Block>
        <Block>
          {isFetching?.studentEval ? (
            <div className="d-flex justify-content-center">
              <Spinner style={{ width: "3rem", height: "3rem" }} />
            </div>
          ) : (
            <div style={{ height: 470, width: "100%" }}>
              <DataGrid
                rows={rows(evaluations)}
                columns={columns(evaluations)}
                pageSizeOptions={[]}
                columnVisibilityModel={columnVisibilityModel}
                checkboxSelection
                onRowSelectionModelChange={handleRowSelectionModelChange}
                rowSelectionModel={rowSelectionModel}
              />
            </div>
          )}
        </Block>

        <ToastContainer />
      </Content>
    </>
  );
}
