import React, { useEffect } from "react";
import { Icon, Button, Col, RSelect } from "../../components/Component";
import { settingTypeList, statusList } from "./SettingData";
import { Modal, ModalBody, Form } from "reactstrap";
import { useForm } from "react-hook-form";

const FormModal = ({ modal, closeModal, onSubmit, formData, setFormData, modalType }) => {
  useEffect(() => {
    reset(formData);
  }, [formData]);

  const {
    reset,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  return (
    <Modal isOpen={modal} toggle={() => closeModal()} className="modal-dialog-centered" size="lg">
      <ModalBody>
        <a
          href="#cancel"
          onClick={(ev) => {
            ev.preventDefault();
            closeModal();
          }}
          className="close"
        >
          <Icon name="cross-sm"></Icon>
        </a>
        <div className="p-2">
          <h5 className="title">
            {modalType === "add" && "Add Setting"} {modalType === "edit" && "Update Setting"}
          </h5>
          <div className="mt-4">
            <Form className="row gy-4" onSubmit={handleSubmit(onSubmit)}>
              <Col md="6">
                <div className="form-group">
                  <label className="form-label">Setting Name*</label>
                  <input
                    disabled={modalType === "edit" && formData.settingType === "Role"}
                    type="text"
                    {...register("name", { required: "This field is required" })}
                    value={formData.name}
                    placeholder="Enter name"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-control"
                  />
                  {errors.name && <span className="invalid">{errors.name.message}</span>}
                </div>
              </Col>
              <Col md="6">
                {modalType === "edit" && formData.settingType === "Role" ? (
                  <div className="mt-4 fw-bold" style={{fontSize: '16px'}}>Setting Type: Role</div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Setting Type*</label>
                    <RSelect
                      {...register("settingType", { required: "This field is required" })}
                      options={settingTypeList}
                      value={[{ value: formData.settingType, label: formData.settingType }]}
                      onChange={(e) => setFormData({ ...formData, settingType: e.value })}
                    />
                    {errors.settingType && <span className="invalid text-danger">{errors.settingType.message}</span>}
                  </div>
                )}
              </Col>
              <Col md="12">
                <div className="form-group">
                  <label className="form-label">Detail</label>
                  <input
                    type="text"
                    value={formData.extValue}
                    placeholder="Enter detail"
                    onChange={(e) => setFormData({ ...formData, extValue: e.target.value })}
                    className="form-control"
                  />
                </div>
              </Col>
              <Col md="6">
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    {...register("displayOrder", { required: "This field is required" })}
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    className="form-control"
                  />
                  {errors.displayOrder && <span className="invalid">{errors.displayOrder.message}</span>}
                </div>
              </Col>
              <Col md="6">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <br />
                  <ul className="custom-control-group">
                    <li>
                      <div
                        style={{ height: 40 }}
                        className="custom-control custom-control-sm custom-radio custom-control-pro checked"
                      >
                        <input
                          disabled={modalType === "edit" && formData.settingType === "Role"}
                          type="radio"
                          className="custom-control-input"
                          name="btnRadioControl"
                          id="btnRadioControl1"
                          defaultChecked={formData.active === "Active" || modalType === "add"}
                          value={"Active"}
                          onClick={(e) => {
                            setFormData({ ...formData, active: e.target.value });
                          }}
                        />
                        <label className="custom-control-label" htmlFor="btnRadioControl1">
                          Active
                        </label>
                      </div>
                    </li>
                    <li>
                      <div
                        style={{ height: 40 }}
                        className="custom-control custom-control-sm custom-radio custom-control-pro"
                      >
                        <input
                          disabled={modalType === "edit" && formData.settingType === "Role"}
                          type="radio"
                          className="custom-control-input"
                          name="btnRadioControl"
                          id="btnRadioControl5"
                          defaultChecked={formData.active === "InActive"}
                          value={"InActive"}
                          onClick={(e) => {
                            setFormData({ ...formData, active: e.target.value });
                          }}
                        />
                        <label className="custom-control-label" htmlFor="btnRadioControl5">
                          InActive
                        </label>
                      </div>
                    </li>
                  </ul>
                </div>
              </Col>
              <Col size="12">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    // {...register("description", { required: "This field is required" })}
                    value={formData.description}
                    placeholder="Your description"
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-control-xl form-control no-resize"
                  />
                  {/* {errors.description && <span className="invalid">{errors.description.message}</span>} */}
                </div>
              </Col>
              <Col size="12">
                <ul className=" text-end">
                  <li>
                    <Button color="primary" size="md" type="submit">
                      {modalType === "add" && "Add Setting"} {modalType === "edit" && "Update Setting"}
                    </Button>
                  </li>
                  {/* <li>
                    <Button
                      onClick={(ev) => {
                        ev.preventDefault();
                        closeModal();
                      }}
                      className="link link-light"
                    >
                      Cancel
                    </Button>
                  </li> */}
                </ul>
              </Col>
            </Form>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};
export default FormModal;
